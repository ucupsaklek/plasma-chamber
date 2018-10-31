pragma solidity ^0.4.24;

import "./Math.sol";
import "./Merkle.sol";
import "./Validate.sol";
import "./TxVerification.sol";

/**
 * @title RootChain
 * @dev This contract secures a utxo payments plasma child chain to ethereum.
 * based on https://github.com/omisego/plasma-mvp/blob/master/plasma/root_chain/contracts/RootChain.sol
 */
contract RootChain {
    using Math for uint256;
    using Merkle for bytes32;

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
      bytes32 data
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
      mapping (address => uint256) weights;
    }

    struct Shelter {
      mapping (address => uint256) weights;
      mapping (uint256 => Exit) packets;
    }

    struct ExitTx {
      TxVerification.Tx tx;
      bytes txBytes;
      bytes proof;
      bytes sigs;
      uint256 index;
      bytes confsigs;
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

    function checkConfSigs(address[] owners, bytes sigs, bytes32 txHash)
      internal
      pure
      returns (bool)
    {
      uint32 i = 0;
      for (uint256 offset = 0; offset < sigs.length; offset += 65) {
        bytes memory sig = ByteUtils.slice(sigs, offset, 65);
        if(owners[i] != ECRecovery.recover(txHash, sig)) {
          return false;
        }
        i = i + 1;
      }
      return true;
    }

    function getTxOwners(TxVerification.Tx memory transaction)
      internal
      pure
      returns (address[] memory)
    {
      uint s = 0;
      uint i = 0;
      for(i = 0; i < transaction.inputs.length; i++) {
        s += transaction.inputs[i].owners.length;
      }
      address[] memory owners = new address[](s);
      for(i = 0; i < transaction.inputs.length; i++) {
        for(uint j = 0; j < transaction.inputs[i].owners.length; j++) {
          owners[i * transaction.inputs.length + j] = transaction.inputs[i].owners[j];
        }
      }
      return owners;
    }

    function parseExitTxList(address chain, uint256 _blkNum, bytes txListBytes)
      internal
      view
      returns (TxVerification.TxState)
    {
      RLP.RLPItem[] memory txList = RLP.toList(RLP.toRlpItem(txListBytes));
      ExitTx[] memory txList2 = new ExitTx[](txList.length);
      uint256 blkNum = _blkNum;
      require(txList.length == 2);
      for (uint i = (txList.length - 1); (i >= 0 && i < 10); i = i.sub(1)) {
        require(i < 2);
        txList2[i] = parseExitTx(
          childChains[chain].blocks[blkNum],
          txList[i]);
        blkNum = txList2[i].tx.inputs[0].blkNum;
        if(i < txList2.length - 1) {
          require(
            keccak256TxInput(txList2[i + 1].tx.inputs[0]) == keccak256TxOutput(txList2[i].tx.outputs[txList2[i].index]));
        }
      }
      if(txList2[0].tx.inputs.length >= 2) {
        require(
          checkConfSigs(
            getTxOwners(txList2[0].tx),
            txList2[0].confsigs,
            keccak256(keccak256(txList2[0].txBytes), childChains[chain].blocks[blkNum].root)
          ) == true
        );
      }
      return txList2[txList2.length - 1].tx.outputs[txList2[txList2.length - 1].index];
    }

    function parseExitTx(ChildBlock childBlock, RLP.RLPItem txItem)
      internal
      view
      returns (ExitTx)
    {
      var txList = RLP.toList(txItem);
      bytes memory txBytes = RLP.toBytes(txList[0]);
      bytes memory proof = RLP.toBytes(txList[1]);
      bytes memory sigs = RLP.toBytes(txList[2]);
      uint index = RLP.toUint(txList[3]);
      bytes memory confsigs;
      if(txList.length > 4) {
        confsigs = RLP.toBytes(txList[4]);
      }
      TxVerification.Tx memory transaction = TxVerification.getTx(txBytes);
      var output = transaction.outputs[index];

      emit Log(childBlock.root);
      checkInclusion(
        childBlock,
        txBytes,
        proof,
        output
      );
      TxVerification.verifyTransaction(
        transaction, keccak256(txBytes), sigs);

      return ExitTx({
        tx: transaction,
        txBytes: txBytes,
        proof: proof,
        sigs: sigs,
        index: index,
        confsigs: confsigs
      });
    }

    function checkInclusion(
      ChildBlock childBlock,
      bytes _txBytes,
      bytes _proofs,
      TxVerification.TxState output
    )
      private
      pure
    {
      for(uint c = 0; c < output.value.length; c++) {
        require(keccak256(_txBytes).checkMembership(
          output.value[c],
          childBlock.root,
          ByteUtils.slice(_proofs, c*512, 512)
        ));
      }
    }

    /**
     * @param _blkNum block number of exit utxo
     * @param _oIndex index of output
     * @param _txListBytes tx bytes list of exit utxo
     */
    function startExit(
      address _chain,
      uint256 _blkNum,
      uint8 _oIndex,
      bytes _txListBytes
    )
      public
    {
      var childBlock = childChains[_chain].blocks[_blkNum];
      var output = parseExitTxList(_chain, _blkNum, _txListBytes);
      // check exitor
      bool isOwner = false;
      for(uint i = 0;i < output.owners.length;i++) {
        if(output.owners[i] == msg.sender) {
          isOwner = true;
        }
      }
      require(isOwner);

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
      TxVerification.verifyTransaction(challengeTx, txHash, _sigs);

      // Delete the owner but keep the amount to prevent another exit.
      if(_cBlkNum > exit.blkNum) {
        exit.challenged = true;
      } else {
        // other challenges
      }
    }

    /**
     * @dev Processes any exits that have completed the challenge period. 
     * @param _utxoPos exit position
     */
    function finalizeExits(address _chain, uint _utxoPos)
        public
    {
      ChildChain childChain = childChains[_chain];
      Exit memory currentExit = childChain.exits[_utxoPos];
      if(
        currentExit.exitableAt < block.timestamp
        && !currentExit.challenged) {
        // state specific withdrawal
        if(currentExit.exitors.length == 1) {
          for(uint i = 0;i < currentExit.values.length;i++) {
            currentExit.exitors[0].transfer(
              childChain.coins[currentExit.values[i]].amount
            );
          }
        }
        delete childChain.exits[_utxoPos];
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
      uint256 _utxoPos = _blkNum * 1000000000 + _utxo.value[0] * 10000 + _oIndex;
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
    TxVerification.verifyTransaction(TxVerification.getTx(txBytes), keccak256(txBytes), sigs);
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

  function keccak256TxOutput(TxVerification.TxState output)
    private
    pure
    returns (bytes32)
  {
    return keccak256(output.owners, output.value, output.stateBytes);
  }

}
