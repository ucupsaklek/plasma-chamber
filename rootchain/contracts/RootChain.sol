pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import "./Math.sol";
import "./PlasmaRLP.sol";
import "./Merkle.sol";
import "./Validate.sol";
import "./PriorityQueue.sol";
import "./TxVerification.sol";

/**
 * @title RootChain
 * @dev This contract secures a utxo payments plasma child chain to ethereum.
 * based on https://github.com/omisego/plasma-mvp/blob/master/plasma/root_chain/contracts/RootChain.sol
 */
contract RootChain {
    using SafeMath for uint256;
    using Merkle for bytes32;
    using PlasmaRLP for bytes;


    /*
     * Events
     */

    event Deposit(
      address chainIndex,
      address indexed depositor,
      uint256 amount,
      uint256 uid
    );

    event DepositFromShelter(
      address chainIndex,
      address indexed depositor,
      uint256 indexed depositBlock,
      address token,
      uint256 amount,
      bytes cont
    );

    event ExitStarted(
      address indexed exitor,
      TxVerification.TxState state
    );

    event BlockSubmitted(
        bytes32 root,
        uint256 timestamp
    );

    event TokenAdded(
        address token
    );

    event Log(
      RLP.RLPItem no
    );


    /*
     * Storage
     */
    address public operator;

    uint256 public constant CHILD_BLOCK_INTERVAL = 1000;

    mapping (address => ChildChain) internal childChains;

    uint256 childChainNum;

    Shelter internal shelter;

    struct Coin {
      uint256 amount;
      uint exit;
    }
    struct Exit {
      address[] exitors;
      uint256[] values;
      bytes stateBytes;
      uint256 exitableAt;
      uint256 oIndex;
      uint256 blkNum;
      bool challenged;
    }

    struct ChildBlock {
        bytes32 root;
        uint256 timestamp;
    }

    struct ChildChain {
      bool initialized;
      address operator;
      uint256 depositCount;
      mapping (uint256 => ChildBlock) blocks;
      uint256 currentChildBlock;
      uint256 currentDepositBlock;
      uint256 currentFeeExit;
      mapping (uint256 => Coin) coins;
      mapping (uint256 => Exit) exits;
      mapping (address => address) exitsQueues;
      mapping (address => uint256) weights;
    }

    struct Shelter {
      mapping (address => uint256) weights;
      mapping (uint256 => Exit) packets;
    }
    
    /*
     * Modifiers
     */

    /**
     * @dev operator for chain
     */
    modifier onlyOperator(address _chain) {
        require(msg.sender == childChains[_chain].operator);
        _;
    }


    /*
     * Constructor
     */

    constructor()
      public
    {
      operator = msg.sender;
      shelter = Shelter();
    }


    /*
     * Public Functions
     */

    /**
     * @dev add child chain.
     * msg.sender is to be the chainId.
     */
    function addChain()
      public
      returns (address)
    {
      // require(msg.value >= 1);
      require(!childChains[msg.sender].initialized); //Reason: struct doesn't allow to be empty
      address _chain = msg.sender;
      ChildChain storage childChain =  childChains[_chain];
      childChain.initialized = true;
      childChain.operator = _chain;
      childChain.currentChildBlock = CHILD_BLOCK_INTERVAL;
      childChain.currentDepositBlock = 1;
      childChain.currentFeeExit = 1;
      childChain.exitsQueues[address(0)] = address(new PriorityQueue());
      return _chain;
    }


    /**
     * @dev Allows Plasma chain operator to submit transaction merkle root.
     * @param _chain The index of child chain
     * @param _root The merkle root of a child chain transactions.
     */
    function submitBlock(address _chain, bytes32 _root)
        public
        onlyOperator(_chain)
    {
      ChildChain childChain = childChains[_chain];
      childChain.blocks[childChain.currentChildBlock] = ChildBlock({
          root: _root,
          timestamp: block.timestamp
      });

      // Update block numbers.
      childChain.currentChildBlock = childChain.currentChildBlock.add(CHILD_BLOCK_INTERVAL);
      childChain.currentDepositBlock = 1;

      emit BlockSubmitted(_root, block.timestamp);
    }

    /**
     * @dev Allows anyone to deposit funds into the Plasma chain.
     */
    function deposit(address _chain)
        public
        payable
    {
      uint256 amount = msg.value;
      ChildChain childChain = childChains[_chain];
      uint uid = uint256(keccak256(address(0), msg.sender, childChain.depositCount));
      childChain.coins[uid] = Coin({
        amount: amount,
        exit: 0
      });
      childChain.depositCount += 1;
      emit Deposit(_chain, msg.sender, amount, uid);
    }

    /**
     * @dev Starts an exit from a deposit.
     */
    function startDepositExit(
      address _chain,
      uint256 blknum,
      uint256 uid
    )
      public
    {
      ChildChain childChain = childChains[_chain];

      // Check that the given UTXO is a deposit.
      require(blknum % CHILD_BLOCK_INTERVAL != 0);

      // Validate the given owner and amount.
      bytes32 root = childChain.blocks[blknum].root;
      bytes32 depositHash = keccak256(msg.sender, uid);
      require(root == depositHash);
      address[] memory owners = new address[](1);
      owners[0] = msg.sender;
      uint256[] memory value = new uint256[](1);
      value[0] = uid;
      addExitToQueue(
        _chain,
        msg.sender,
        TxVerification.TxState({
          owners: owners,
          value: value,
          state: RLP.toList(RLP.toRlpItem(hex"c100")),
          stateBytes: hex"c100"
        }),
        blknum,
        0,
        childChain.blocks[blknum].timestamp
      );
    }

    /**
     * @param _blkNum block number of exit utxo
     * @param _oIndex index of output
     * @param _txBytes tx bytes of exit utxo
     * @param _proofs of coins which include in utxo
     * @param _sigs signatures
     * @param _confsigs confirmation signatures(if needed)
     */
    function startExit(
      address _chain,
      uint256 _blkNum,
      uint8 _oIndex,
      bytes _txBytes,
      bytes _proofs,
      bytes _sigs,
      bytes _confsigs
    )
      public
    {
      var exitingTx = TxVerification.getTx(_txBytes);
      var output = exitingTx.outputs[_oIndex];
      // check exitor
      bool isOwner = false;
      for(uint i = 0;i < output.owners.length;i++) {
        if(output.owners[i] == msg.sender) {
          isOwner = true;
        }
      }
      require(isOwner);
      // output.value is list of coin id
      // confirm tx inclusion proof for each coin
      var childBlock = childChains[_chain].blocks[_blkNum];
      for(uint c = 0; c < output.value.length; c++) {
        require(keccak256(_txBytes).checkMembership(
          output.value[c],
          childBlock.root,
          ByteUtils.slice(_proofs, c*512, 512)
        ));
      }
      // verify transaction
      verifyTransaction(_txBytes, _sigs);

      addExitToQueue(
        _chain,
        msg.sender,
        output,
        _blkNum,
        _oIndex,
        childBlock.timestamp);
    }

    /**
     * @dev challenge exiting coin
     * @param _cBlkNum challenging block number
     * @param _uid coin id
     * @param _txBytes The challenging transaction in bytes RLP form.
     * @param _proof Proof of inclusion for the transaction used to challenge.
     * @param _sigs Signatures for the transaction used to challenge.
     */
    function challengeExit(
      address _chain,
      uint256 _cBlkNum,
      uint256 _uid,
      bytes _txBytes,
      bytes _proof,
      bytes _sigs
    )
      public
    {
      // There is exit for coin
      require(childChains[_chain].coins[_uid].exit > 0);
      uint256 _eUtxoPos = childChains[_chain].coins[_uid].exit;
      Exit exit = childChains[_chain].exits[_eUtxoPos];
      var challengeTx = TxVerification.getTx(_txBytes);
      bytes32 root = childChains[_chain].blocks[_cBlkNum].root;
      var txHash = keccak256(_txBytes);
      require(keccak256TxInput(challengeTx.inputs[exit.oIndex]) == keccak256Exit(exit));
      
      // var confirmationHash = keccak256(txHash, root);
      var merkleHash = keccak256(txHash, _sigs);
      //address owner = childChains[_chain].exits[eUtxoPos].exitor;

      // Validate the spending transaction.
      //require(owner == ECRecovery.recover(confirmationHash, _confirmationSig));
      require(merkleHash.checkMembership(_uid, root, _proof));
      verifyTransaction(_txBytes, _sigs);

      // Delete the owner but keep the amount to prevent another exit.
      if(_cBlkNum > exit.blkNum) {
        exit.challenged = true;
      } else {
        // other challenges
      }
    }

    /**
     * @dev Determines the next exit to be processed.
     * @param _token Asset type to be exited.
     * @return A tuple of the position and time when this exit can be processed.
     */
    function getNextExit(address _chain, address _token)
        public
        view
        returns (uint256, uint256)
    {
        return PriorityQueue(childChains[_chain].exitsQueues[_token]).getMin();
    }

    /**
     * @dev Processes any exits that have completed the challenge period. 
     * @param _token Token type to process.
     */
    function finalizeExits(address _chain, address _token)
        public
    {
      ChildChain childChain = childChains[_chain];
      uint256 utxoPos;
      uint256 exitableAt;
      (exitableAt, utxoPos) = getNextExit(_chain, _token);
      PriorityQueue queue = PriorityQueue(childChain.exitsQueues[_token]);
      Exit memory currentExit = childChain.exits[utxoPos];
      while (exitableAt < block.timestamp) {
        currentExit = childChain.exits[utxoPos];

        // TODO: handle ERC-20 transfer
        require(address(0) == _token);

        delete childChain.exits[utxoPos];

        if (queue.currentSize() > 0) {
            (exitableAt, utxoPos) = getNextExit(_chain, _token);
        } else {
            return;
        }
      }
    }


    /* 
     * Public view functions
     */

    /**
     * @dev Queries the child chain.
     * @param _blockNumber Number of the block to return.
     * @return Child chain block at the specified block number.
     */
    function getChildChain(address _chain, uint256 _blockNumber)
        public
        view
        returns (bytes32, uint256)
    {
      ChildChain childChain = childChains[_chain];
      return (childChain.blocks[_blockNumber].root, childChain.blocks[_blockNumber].timestamp);
    }

    /**
     * @dev Determines the next deposit block number.
     * @return Block number to be given to the next deposit block.
     */
    function getDepositBlock(address _chain)
        public
        view
        returns (uint256)
    {
      ChildChain childChain = childChains[_chain];
      return childChain.currentChildBlock
              .sub(CHILD_BLOCK_INTERVAL)
              .add(childChain.currentDepositBlock);
    }

    /**
     * @dev Returns information about an exit.
     * @param _utxoPos Position of the UTXO in the chain.
     * @return A tuple representing the active exit for the given UTXO.
     */
    function getExit(address _chain, uint256 _utxoPos)
        public
        view
        returns (address[], uint256[], bytes)
    {
      ChildChain childChain = childChains[_chain];
      return (
        childChain.exits[_utxoPos].exitors,
        childChain.exits[_utxoPos].values,
        childChain.exits[_utxoPos].stateBytes
      );
    }


    /*
     * Private functions
     */

    /**
     * @dev Adds an exit to the exit queue.
     * @param _exitor Owner of the UTXO.
     * @param _utxo UTXO data.
     * @param _created_at Time when the UTXO was created.
     */
    function addExitToQueue(
      address _chain, 
      address _exitor,
      TxVerification.TxState _utxo,
      uint256 _blkNum,
      uint256 _oIndex,
      uint256 _created_at
    )
      private
    {
      uint256 _utxoPos = _blkNum * 1000000000 + _oIndex;
      uint256 exitableAt = Math.max(_created_at + 2 weeks, block.timestamp + 1 weeks);
      // need to check the coin already isn't exiting status
      for(uint c = 0; c < _utxo.value.length; c++) {
        childChains[_chain].coins[c].exit = _utxoPos;
      }

      childChains[_chain].exits[_utxoPos] = Exit({
        exitors: _utxo.owners,
        values: _utxo.value,
        stateBytes: _utxo.stateBytes,
        exitableAt: exitableAt,
        oIndex: _oIndex,
        blkNum: _blkNum,
        challenged: false
      });

      emit ExitStarted(msg.sender, _utxo);
    }

  function verifyTransaction(bytes txBytes, bytes sigs)
    public
    pure
  {
    TxVerification.verifyTransaction(txBytes, sigs);
  }

  function keccak256Exit(Exit exit)
    private
    pure
    returns (bytes32)
  {
    return keccak256(exit.exitors, exit.values, exit.stateBytes);
  }

  function keccak256TxInput(TxVerification.TxInput input)
    private
    pure
    returns (bytes32)
  {
    return keccak256(input.owners, input.value, input.stateBytes);
  }

}
