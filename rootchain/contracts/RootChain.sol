pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./Array.sol";
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
    using Array for address[];
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

    mapping (address => ChildChain) public childChains;

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
      uint256 txListLength;
      mapping (uint256 => ExitingTx) txList;
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
      mapping (uint256 => ExitingTx) challenges;
      mapping (address => uint256) weights;
    }

    struct Shelter {
      mapping (address => uint256) weights;
      mapping (uint256 => Exit) packets;
    }

    struct ExitTx {
      TxVerification.Tx tx;
      uint256 blkNum;
      bytes txBytes;
      bytes proof;
      bytes sigs;
      uint256 index;
      bytes confsigs;
    }

    struct ExitingTx {
      bytes txBytes;
      // TxVerification.Tx tx;
      uint256 blkNum;
      uint256 index;
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

    /**
     * @dev parseExitTxList is core logic for exit
     * checking all transactions are in merkle root
     * checking state transitions are correct
     * checking confirmation signatures if needed
     */
    function parseExitTxList(ChildChain storage chain, uint256 _blkNum, bytes txListBytes)
      internal
      view
      returns (ExitTx[])
    {
      RLP.RLPItem[] memory txList = RLP.toList(RLP.toRlpItem(txListBytes));
      ExitTx[] memory exitTxList = new ExitTx[](txList.length);
      uint256 blkNum = _blkNum;
      require(txList.length == 2);
      for(uint i = txList.length - 1;i >= 0 && i < txList.length; i--) {
        exitTxList[i] = parseExitTx(
          chain.blocks[blkNum],
          txList[i]);
        require(exitTxList[i].blkNum == blkNum);
        blkNum = exitTxList[i].tx.inputs[0].blkNum;
        if(i < exitTxList.length - 1) {
          require(
            keccak256TxInput(exitTxList[i + 1].tx.inputs[0]) == keccak256TxOutput(exitTxList[i].tx.outputs[exitTxList[i].index]));
        }
      }
      if(exitTxList[0].tx.inputs.length >= 2) {
        require(
          checkConfSigs(
            getTxOwners(exitTxList[0].tx),
            exitTxList[0].confsigs,
            keccak256(keccak256(exitTxList[0].txBytes), chain.blocks[blkNum].root)
          ) == true
        );
      }
      return exitTxList;
    }

    function parseExitTx(ChildBlock childBlock, RLP.RLPItem txItem)
      internal
      pure
      returns (ExitTx)
    {
      var txList = RLP.toList(txItem);
      uint256 blkNum = RLP.toUint(txList[0]);
      bytes memory txBytes = RLP.toBytes(txList[1]);
      bytes memory proof = RLP.toBytes(txList[2]);
      bytes memory sigs = RLP.toBytes(txList[3]);
      uint index = RLP.toUint(txList[4]);
      bytes memory confsigs;
      if(txList.length > 5) {
        confsigs = RLP.toBytes(txList[5]);
      }
      TxVerification.Tx memory transaction = TxVerification.getTx(txBytes);
      bytes32 txHash = keccak256(txBytes);

      checkInclusion(
        childBlock.root,
        txHash,
        proof,
        transaction.outputs[index].value
      );
      TxVerification.verifyTransaction(
        transaction, txHash, sigs);

      return ExitTx({
        blkNum: blkNum,
        tx: transaction,
        txBytes: txBytes,
        proof: proof,
        sigs: sigs,
        index: index,
        confsigs: confsigs
      });
    }

    function checkInclusion(
      bytes32 root,
      bytes32 txHash,
      bytes _proofs,
      uint256[] value
    )
      private
      pure
    {
      for(uint c = 0; c < value.length; c++) {
        require(txHash.checkMembership(
          value[c],
          root,
          ByteUtils.slice(_proofs, c*512, 512)
        ));
      }
    }

    /**
     * @dev start exit UTXO
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
      var txList = parseExitTxList(childChains[_chain], _blkNum, _txListBytes);
      var output = txList[txList.length - 1].tx.outputs[txList[txList.length - 1].index];

      // msg.sender must be exitor
      require(output.owners.contains(msg.sender));

      addToExitList(
        _chain,
        msg.sender,
        output,
        txList,
        childBlock.timestamp);
    }

    /**
     * @dev challenge by spent transaction
     * @param _cIndex the index of inputs
     * @param _cBlkNum block number of challenge tx
     * @param _eUtxoPos exiting utxo position
     * @param _txBytes The challenging transaction in bytes RLP form.
     * @param _proof Proof of inclusion for the transaction used to challenge.
     * @param _sigs Signatures for the transaction used to challenge.
     */
    function challengeAfter(
      address _chain,
      uint256 _cIndex,
      uint256 _cBlkNum,
      uint256 _eUtxoPos,
      bytes _txBytes,
      bytes _proof,
      bytes _sigs,
      bytes _confsigs
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      require(_cBlkNum > exit.txList[exit.txListLength - 1].blkNum);
      var challengeTx = TxVerification.getTx(_txBytes);
      checkTx(
        childChain.blocks[_cBlkNum].root,
        _txBytes,
        _proof,
        _sigs,
        _confsigs,
        _cIndex,
        challengeTx
      );
      require(keccak256TxInput(challengeTx.inputs[_cIndex]) == keccak256Exit(exit));
      delete childChain.exits[_eUtxoPos];
    }

    /**
     * @param _txInfos txBytes, proof, sigs, confsigs
     */
    function challengeBetween(
      address _chain,
      uint256 _cIndex,
      uint256 _cBlkNum,
      uint256 _eUtxoPos,
      bytes[] _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      require(exit.txListLength >= 2);
      for(uint i = 0;i < exit.txListLength - 1;i++) {
        if(exit.txList[i].blkNum < _cBlkNum && _cBlkNum < exit.txList[i + 1].blkNum) {
          TxVerification.Tx memory prevTx = TxVerification.getTx(exit.txList[i].txBytes);
          TxVerification.Tx memory challengeTx = TxVerification.getTx(_txInfos[0]);
          require(
            keccak256TxOutput(prevTx.outputs[exit.txList[i].index])
            == keccak256TxInput(challengeTx.inputs[_cIndex]));
          ChildBlock childBlock = childChain.blocks[_cBlkNum];
          checkTx(
            childBlock.root,
            _txInfos[0],
            _txInfos[1],
            _txInfos[2],
            _txInfos[3],
            _cIndex,
            challengeTx
          );
          delete childChain.exits[_eUtxoPos];
          break;
        }
      }
    }

    /**
     * @param _txInfos txBytes, proof, sigs, confsigs
     */
    function challengeBefore(
      address _chain,
      uint256 _cIndex,
      uint256 _cBlkNum,
      uint256 _eUtxoPos,
      bytes[] _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      require(_cBlkNum < exit.txList[0].blkNum);
      var challengeTx = TxVerification.getTx(_txInfos[0]);
      ChildBlock childBlock = childChain.blocks[_cBlkNum];
      checkTx(
        childBlock.root,
        _txInfos[0],
        _txInfos[1],
        _txInfos[2],
        _txInfos[3],
        _cIndex,
        challengeTx
      );
      require(hasSameCoin(
        challengeTx,
        childChain,
        _eUtxoPos
      ), 'challenge transaction should has same coin');
      childChain.challenges[_eUtxoPos] = ExitingTx({
        txBytes: _txInfos[0],
        blkNum: _cBlkNum,
        index: _cIndex
      });
      exit.challenged = true;
    }

    function checkTx(
      bytes32 root,
      bytes _txBytes,
      bytes _proof,
      bytes _sigs,
      bytes _confsigs,
      uint256 _cIndex,
      TxVerification.Tx challengeTx
    )
      private
      pure
    {
      bytes32 txHash = keccak256(_txBytes);
      checkInclusion(
        root,
        txHash,
        _proof,
        challengeTx.inputs[_cIndex].value
      );
      TxVerification.verifyTransaction(challengeTx, txHash, _sigs);
      if(challengeTx.inputs.length >= 2) {
        require(
          checkConfSigs(
            getTxOwners(challengeTx),
            _confsigs,
            keccak256(txHash, root)
          ) == true
        );
      }
    }

    function hasSameCoin(
      TxVerification.Tx challengeTx,
      ChildChain storage childChain,
      uint256 _eUtxoPos
    )
      private
      view
      returns (bool)
    {
      for(uint i = 0;i < challengeTx.outputs.length;i++) {
        for(uint j = 0;j < challengeTx.outputs[i].value.length;j++) {
          if(childChain.coins[challengeTx.outputs[i].value[j]].exit == _eUtxoPos) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * @param _txInfos txBytes, proof, sigs, confsigs
     */
    function respondChallenge(
      address _chain,
      uint256 _cIndex,
      uint256 _cBlkNum,
      uint256 _eUtxoPos,
      bytes[] _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      var challenge = childChain.challenges[_eUtxoPos];
      var challengeTx = TxVerification.getTx(challenge.txBytes);
      require(_cBlkNum > challenge.blkNum);
      var respondTx = TxVerification.getTx(_txInfos[0]);
      checkTx(
        childChain.blocks[_cBlkNum].root,
        _txInfos[0],
        _txInfos[1],
        _txInfos[2],
        _txInfos[3],
        _cIndex,
        respondTx
      );
      require(keccak256TxInput(respondTx.inputs[_cIndex]) == keccak256TxOutput(challengeTx.outputs[challenge.index]));
      delete childChain.challenges[_eUtxoPos];
      exit.challenged = false;
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
    function addToExitList(
      address _chain, 
      address _exitor,
      TxVerification.TxState _utxo,
      ExitTx[] txList,
      uint256 _created_at
    )
      private
    {
      
      uint256 _utxoPos = txList[txList.length - 1].blkNum * 1000000000 + _utxo.value[0] * 10000 + txList[txList.length - 1].index;
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
        txListLength: txList.length,
        challenged: false
      });
      for(uint i = 0;i < txList.length;i++) {
        childChains[_chain].exits[_utxoPos].txList[i] = ExitingTx({
          txBytes: txList[i].txBytes,
          blkNum: txList[i].blkNum,
          index: txList[i].index
        });
      }

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
