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
      uint256 indexed utxoPos,
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

    struct Exit {
      bool hasValue;
      uint exitTime;
      uint exitTxBlkNum;
      bytes exitTx;
      uint txBeforeExitTxBlkNum;
      bytes txBeforeExitTx;
      address exitor;
      address[] owners;
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
      childChain.wallet[uid] = amount;
      childChain.depositCount += 1;
      emit Deposit(_chain, msg.sender, amount, uid);
    }

    /**
     * @dev Starts an exit from a deposit.
     * @param _depositPos UTXO position of the deposit.
     * @param _token Token type to deposit.
     * @param _amount Deposit amount.
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
      addExitToQueue(
        _chain,
        uid,
        msg.sender,
        TxVerification.TxState({
          owners: owners,
          state: RLP.toList(RLP.toRlpItem(hex"c100")),
          stateBytes: hex"c100"
        }),
        childChain.blocks[blknum].timestamp,
        blknum
      );
    }

    /**
     * @dev Starts to exit a specified utxo.
     * @param _utxoPos The position of the exiting utxo in the format of blknum * 1000000000 + index * 10000 + oindex.
     * @param _txBytes The transaction being exited in RLP bytes format.
     * @param _proof Proof of the exiting transactions inclusion for the block specified by utxoPos.
     * @param _sigs Both transaction signatures and confirmations signatures used to verify that the exiting transaction has been confirmed.
     */
    function startExit(
      address _chain,
      uint256 _blkNum,
      uint256 _uid,
      bytes _txBytes,
      bytes _proof,
      bytes _sigs
    )
      public
    {
      var exitingTx = TxVerification.getTx(_txBytes);
      var output = getOutput(exitingTx, _uid);
      bool isOwner = false;
      for(uint i = 0;i < output.owners.length;i++) {
        if(output.owners[i] == msg.sender) {
          isOwner = true;
        }
      }
      require(isOwner);

      var childBlock = childChains[_chain].blocks[_blkNum];
      bytes32 merkleHash = keccak256(keccak256(_txBytes), ByteUtils.slice(_sigs, 0, 65 * exitingTx.inputs.length));
      // need signature for transaction
      require(merkleHash.checkMembership(_uid, childBlock.root, _proof));
      verifyTransaction(_txBytes, _sigs);

      addExitToQueue(
        _chain,
        _uid,
        msg.sender,
        output,
        childBlock.timestamp,
        _blkNum);
    }

    /**
     * @dev Allows anyone to challenge an exiting transaction by submitting proof of a double spend on the child chain.
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
      var challengeTx = TxVerification.getTx(_txBytes);
      uint256 eUtxoPos = challengeTx.inputs[_eUtxoIndex].blkNum + challengeTx.inputs[_eUtxoIndex].txIndex + challengeTx.inputs[_eUtxoIndex].oIndex;
      uint256 txindex = (_cUtxoPos % 1000000000) / 10000;
      bytes32 root = childChains[_chain].blocks[_cUtxoPos / 1000000000].root;
      var txHash = keccak256(_txBytes);
      require(keccak256TxInput(challengeTx.inputs[_eUtxoIndex]) == keccak256Exit(childChains[_chain].exits[eUtxoPos]));
      
      // var confirmationHash = keccak256(txHash, root);
      var merkleHash = keccak256(txHash, _sigs);
      //address owner = childChains[_chain].exits[eUtxoPos].exitor;

      // Validate the spending transaction.
      //require(owner == ECRecovery.recover(confirmationHash, _confirmationSig));
      require(merkleHash.checkMembership(txindex, root, _proof));
      verifyTransaction(_txBytes, _sigs);

      // Delete the owner but keep the amount to prevent another exit.
      if(_cUtxoPos > childChains[_chain].exits[eUtxoPos].exitTxBlkNum) {
        delete childChains[_chain].exits[eUtxoPos].exitor;
      } else if (
        _cUtxoPos < childChains[_chain].exits[eUtxoPos].exitTxBlkNum
        && txBeforeExitTxObj.newOwner == challengeTxObj.signer) {
        delete childChains[_chain].exits[eUtxoPos].exitor;
      } else if (
        _cUtxoPos < childChains[_chain].exits[eUtxoPos].exitTxBlkNum) {
        // challenges.push()
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
        require(_token == currentExit.value.assetId);
        require(childChain.weights[_token] >= currentExit.value.amount);

        // if there is no owner
        if(TxVerification.verifyWithdrawal(currentExit.owners, currentExit.value, currentExit.state)) {
          currentExit.exitor.transfer(currentExit.value.amount);
        }else{
          shelter.weights[_token] += currentExit.value.amount;
          shelter.packets[utxoPos] = currentExit;
        }
        childChain.weights[_token] -= currentExit.value.amount;
        queue.delMin();
        delete childChain.exits[utxoPos].exitor;

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
        returns (address, address[], address, uint256, bytes)
    {
      ChildChain childChain = childChains[_chain];
      return (
        childChain.exits[_utxoPos].exitor,
        childChain.exits[_utxoPos].owners,
        childChain.exits[_utxoPos].value.assetId,
        childChain.exits[_utxoPos].value.amount,
        childChain.exits[_utxoPos].state
      );
    }


    /*
     * Private functions
     */

    /**
     * @dev Adds an exit to the exit queue.
     * @param _utxoPos Position of the UTXO in the child chain.
     * @param _exitor Owner of the UTXO.
     * @param _utxo UTXO data.
     * @param _created_at Time when the UTXO was created.
     */
    function addExitToQueue(
      address _chain, 
      uint256 _uid,
      address _exitor,
      TxVerification.TxState _utxo,
      uint256 _created_at,
      uint256 _exitTxBlkNum
    )
      private
    {

      // Check that we're exiting a known token.
      require(childChains[_chain].exitsQueues[_utxo.value.assetId] != address(0));

      // Check exit is valid and doesn't already exist.
      // require(_amount > 0);
      require(childChains[_chain].exits[_uid].exitor == address(0));

      // Calculate priority.
      uint256 exitableAt = Math.max(_created_at + 2 weeks, block.timestamp + 1 weeks);
      PriorityQueue queue = PriorityQueue(childChains[_chain].exitsQueues[_utxo.value.assetId]);
      queue.insert(exitableAt, _uid);

      childChains[_chain].exits[_uid] = Exit({
        exitor: _exitor,
        owners: _utxo.owners,
        value: _utxo.value,
        state: _utxo.stateBytes,
        exitTxBlkNum: _exitTxBlkNum
      });

      emit ExitStarted(msg.sender, _uid, _utxo);
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
    return keccak256(exit.owners, exit.value.assetId, exit.value.amount, exit.state);
  }

  function keccak256TxInput(TxVerification.TxInput input)
    private
    pure
    returns (bytes32)
  {
    return keccak256(input.owners, input.value.assetId, input.value.amount, input.stateBytes);
  }

  function getOutput(TxVerification.Tx transaction, uint256 uid)
    private
    pure
    returns (TxVerification.TxState)
  {
    for(uint8 i = 0;i < transaction.outputs.length;i++) {
      for(uint8 j = 0;j < transaction.outputs[i].value.length;j++) {
        if(transaction.outputs[i].value[j] == uid) {
          return transaction.outputs[i];
        }
      }
    }
  }

}
