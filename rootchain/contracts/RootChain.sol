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
      uint256 indexed depositBlock,
      address token,
      uint256 amount
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
      address exitor;
      address[] owners;
      TxVerification.PlasmaValue value;
      bytes state;
    }

    struct ChildBlock {
        bytes32 root;
        uint256 timestamp;
    }

    struct ChildChain {
      bool initialized;
      address operator;
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
        ChildChain childChain = childChains[_chain];
        // Only allow up to CHILD_BLOCK_INTERVAL deposits per child block.
        require(childChain.currentDepositBlock < CHILD_BLOCK_INTERVAL);

        bytes32 root = keccak256(msg.sender, address(0), msg.value);
        uint256 depositBlock = getDepositBlock(_chain);
        childChain.blocks[depositBlock] = ChildBlock({
            root: root,
            timestamp: block.timestamp
        });
        childChain.currentDepositBlock = childChain.currentDepositBlock.add(1);
        childChain.weights[address(0)] += msg.value;

        emit Deposit(_chain, msg.sender, depositBlock, address(0), msg.value);
    }

    /**
     * @dev Starts an exit from a deposit.
     * @param _depositPos UTXO position of the deposit.
     * @param _token Token type to deposit.
     * @param _amount Deposit amount.
     */
    function startDepositExit(
      address _chain,
      uint256 _depositPos,
      address _token,
      uint256 _amount
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      uint256 blknum = _depositPos / 1000000000;

      // Check that the given UTXO is a deposit.
      require(blknum % CHILD_BLOCK_INTERVAL != 0);

      // Validate the given owner and amount.
      bytes32 root = childChain.blocks[blknum].root;
      bytes32 depositHash = keccak256(msg.sender, _token, _amount);
      require(root == depositHash);
      address[] memory owners = new address[](1);
      owners[0] = msg.sender;
      addExitToQueue(
        _chain,
        _depositPos,
        msg.sender,
        TxVerification.TxState({
          owners: owners,
          value: TxVerification.PlasmaValue({
            assetId: _token,
            amount: _amount
          }),
          state: RLP.toList(RLP.toRlpItem(hex"c100")),
          stateBytes: hex"c100"
        }),
        childChain.blocks[blknum].timestamp
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
      uint256 _utxoPos,
      bytes _txBytes,
      bytes _proof,
      bytes _sigs
    )
      public
    {
      uint256 blknum = _utxoPos / 1000000000;
      uint256 txindex = (_utxoPos % 1000000000) / 10000;
      uint256 oindex = _utxoPos - blknum * 1000000000 - txindex * 10000; 
      var exitingTx = TxVerification.getTx(_txBytes);
      var output = exitingTx.outputs[oindex];
      bool isOwner = false;
      for(uint i = 0;i < output.owners.length;i++) {
        if(output.owners[i] == msg.sender) {
          isOwner = true;
        }
      }
      require(isOwner);

      var childBlock = childChains[_chain].blocks[blknum];
      bytes32 merkleHash = keccak256(keccak256(_txBytes), ByteUtils.slice(_sigs, 0, 65 * exitingTx.inputs.length));
      // need signature for transaction
      require(merkleHash.checkMembership(txindex, childBlock.root, _proof));
      verifyTransaction(_txBytes, _sigs);

      addExitToQueue(
        _chain,
        _utxoPos,
        msg.sender,
        output,
        childBlock.timestamp);
    }

    /**
     * @dev Allows anyone to challenge an exiting transaction by submitting proof of a double spend on the child chain.
     * @param _cUtxoPos The position of the challenging utxo.
     * @param _eUtxoIndex The output position of the exiting utxo.
     * @param _txBytes The challenging transaction in bytes RLP form.
     * @param _proof Proof of inclusion for the transaction used to challenge.
     * @param _sigs Signatures for the transaction used to challenge.
     * @param _confirmationSig The confirmation signature for the transaction used to challenge.
     */
    function challengeExit(
      address _chain,
      uint256 _cUtxoPos,
      uint256 _eUtxoIndex,
      bytes _txBytes,
      bytes _proof,
      bytes _sigs,
      bytes _confirmationSig
    )
      public
    {
      var challengeTx = TxVerification.getTx(_txBytes);
      uint256 eUtxoPos = challengeTx.inputs[_eUtxoIndex].blkNum + challengeTx.inputs[_eUtxoIndex].txIndex + exitingTx.inputs[_eUtxoIndex].oIndex;
      uint256 txindex = (_cUtxoPos % 1000000000) / 10000;
      bytes32 root = childChains[_chain].blocks[_cUtxoPos / 1000000000].root;
      var txHash = keccak256(_txBytes);
      for(uint i = 0;i < challengeTx.inputs[_eUtxoIndex].owners.length;i++) {
        require(challengeTx.inputs[_eUtxoIndex].owners[i] == childChains[_chain].exits[eUtxoPos].owners[i]);
      }
      // TODO: require(keccak256(challengeTx) == keccak256(childChains[_chain].exits[eUtxoPos]))
      
      // var confirmationHash = keccak256(txHash, root);
      var merkleHash = keccak256(txHash, _sigs);
      //address owner = childChains[_chain].exits[eUtxoPos].exitor;

      // Validate the spending transaction.
      //require(owner == ECRecovery.recover(confirmationHash, _confirmationSig));
      require(merkleHash.checkMembership(txindex, root, _proof));
      verifyTransaction(_txBytes, _sigs);

      // Delete the owner but keep the amount to prevent another exit.
      delete childChains[_chain].exits[eUtxoPos].exitor;
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
        returns (address, address[], address, uint256)
    {
      ChildChain childChain = childChains[_chain];
      return (
        childChain.exits[_utxoPos].exitor,
        childChain.exits[_utxoPos].owners,
        childChain.exits[_utxoPos].value.assetId,
        childChain.exits[_utxoPos].value.amount
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
      uint256 _utxoPos,
      address _exitor,
      TxVerification.TxState _utxo,
      uint256 _created_at
    )
      private
    {

      // Check that we're exiting a known token.
      require(childChains[_chain].exitsQueues[_utxo.value.assetId] != address(0));

      // Check exit is valid and doesn't already exist.
      // require(_amount > 0);
      require(childChains[_chain].exits[_utxoPos].exitor == address(0));

      // Calculate priority.
      uint256 exitableAt = Math.max(_created_at + 2 weeks, block.timestamp + 1 weeks);
      PriorityQueue queue = PriorityQueue(childChains[_chain].exitsQueues[_utxo.value.assetId]);
      queue.insert(exitableAt, _utxoPos);

      childChains[_chain].exits[_utxoPos] = Exit({
        exitor: _exitor,
        owners: _utxo.owners,
        value: _utxo.value,
        state: _utxo.stateBytes
      });

      emit ExitStarted(msg.sender, _utxoPos, _utxo);
    }

  function verifyTransaction(bytes txBytes, bytes sigs)
    public
    pure
  {
    TxVerification.verifyTransaction(txBytes, sigs);
  }

}
