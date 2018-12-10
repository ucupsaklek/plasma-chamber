pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./Array.sol";
import "./Math.sol";
import "./Merkle.sol";
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
      uint256 start,
      uint256 end
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
      uint n
    );


    /*
     * Storage
     */
    address public operator;

    uint256 public constant CHILD_BLOCK_INTERVAL = 1000;
    uint256 public constant CHUNK_SIZE = 1000000000000000000;

    mapping (address => ChildChain) public childChains;

    uint256 childChainNum;

    struct Segment {
      uint256 start;
      uint256 end;
    }

    struct Coin {
      address token;
      mapping (uint256 => Segment) withdrawals;
      uint nWithdrawals;
      uint exit;
      bool hasValue;
    }
    struct Exit {
      uint256 blkNum;
      uint256 exitableAt;
      // exiting output is always one
      ExitTxo output;
      // exiting transaction's input is always one
      ExitTxo input;
      // There are multiple challenges
      uint8 challengeCount;
    }

    struct Challenge {
      bytes txBytes;
      uint256 blkNum;
      uint256 index;
      uint256 exitPos;
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
      mapping (uint256 => Challenge) challenges;
      mapping (address => uint256) weights;
    }

    struct ExitTxo {
      address[] owners;
      uint256[] values;
      bytes state;
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
      childChain.currentChildBlock = 1;
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
      childChain.currentChildBlock = childChain.currentChildBlock.add(1);

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
      require(amount % CHUNK_SIZE == 0);
      ChildChain childChain = childChains[_chain];
      uint start = childChain.depositCount;
      uint end = start + amount;
      uint slot = start / CHUNK_SIZE;
      uint slotEnd = end / CHUNK_SIZE;
      for(uint i = slot;i < slotEnd;i++) {
        require(!childChain.coins[i].hasValue);
        childChain.coins[i] = Coin({
          token: address(0),
          nWithdrawals: 0,
          exit: 0,
          hasValue: true
        });
      }
      childChain.blocks[childChain.currentChildBlock] = ChildBlock({
          root: keccak256(slot),
          timestamp: block.timestamp
      });
      childChain.currentChildBlock = childChain.currentChildBlock.add(1);
      childChain.depositCount = end;
      emit Deposit(_chain, msg.sender, start, end);
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

    function checkInclusion(
      bytes32 root,
      bytes32 txHash,
      bytes _proofs,
      TxVerification.Amount[] values
    )
      private
      pure
    {
      for(uint c = 0; c < values.length; c++) {
        uint a = values[c].start / CHUNK_SIZE;
        require(values[c].start == 0 || values[c].start == 1000000000000000000);
        require(txHash.checkMembership(
          values[c].start / CHUNK_SIZE,
          values[c].end / CHUNK_SIZE,
          root,
          ByteUtils.slice(_proofs, c*512, 512)
        ));
      }
    }

    /**
     * @dev start exit UTXO
     * @param _blkNum block number of exit utxo
     * @param _oIndex index of output
     * @param _exitTxBytes exiting transaction
     */
    function startExit(
      address _chain,
      uint256 _blkNum,
      uint8 _oIndex,
      bytes _exitTxBytes,
      bytes _txInfoBytes
    )
      public
    {
      var childBlock = childChains[_chain].blocks[_blkNum];
      var exitTx = TxVerification.getTx(_exitTxBytes);
      // if there are 2 inputs this exit don't need prev tx because it has confsig.
      var input = exitTx.inputs[0];
      var output = exitTx.outputs[_oIndex];
      checkTx(
        childBlock.root,
        _exitTxBytes,
        _txInfoBytes,
        output.value,
        exitTx
      );

      // msg.sender must be exitor
      require(output.owners.contains(msg.sender));

      addToExitList(
        _chain,
        msg.sender,
        input,
        output,
        _blkNum,
        childBlock.timestamp);
    }

    /**
     * @dev challenge by spent transaction. exit process finish soon.
     * @param _cIndex the index of inputs
     * @param _cBlkNum block number of challenge tx
     * @param _eUtxoPos exiting utxo position
     * @param _txInfos The challenging transaction in bytes RLP form.
     */
    function challengeAfter(
      address _chain,
      uint256 _cIndex,
      uint256 _cBlkNum,
      uint256 _eUtxoPos,
      bytes _txBytes,
      bytes _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      require(_cBlkNum > exit.blkNum);
      var challengeTx = TxVerification.getTx(_txBytes);
      checkTx(
        childChain.blocks[_cBlkNum].root,
        _txBytes,
        _txInfos,
        challengeTx.inputs[_cIndex].value,
        challengeTx
      );
      require(keccak256TxOutput(challengeTx.inputs[_cIndex]) == keccak256ExitTxo(exit.output));
      delete childChain.exits[_eUtxoPos];
    }

    /**
     * @dev start challenge game
     * @param _txInfos txBytes, proof, sigs, confsigs
     */
    function challengeBefore(
      address _chain,
      uint256 _cIndex,
      uint256 _cBlkNum,
      uint256 _eUtxoPos,
      bytes _txBytes,
      bytes _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      // check challenge tx is before exiting tx
      require(_cBlkNum < exit.blkNum);
      var challengeTx = TxVerification.getTx(_txBytes);
      ChildBlock childBlock = childChain.blocks[_cBlkNum];
      checkTx(
        childBlock.root,
        _txBytes,
        _txInfos,
        challengeTx.outputs[_cIndex].value,
        challengeTx
      );
      require(withinRange(
        challengeTx.outputs[_cIndex].value,
        exit.output
      ), 'challenge transaction should has same coin');
      // _cBlkNum is challenge position
      uint challengePos = _cBlkNum * 1000000 + getSlot(challengeTx.outputs[_cIndex].value[0]);
      childChain.challenges[challengePos] = Challenge({
        txBytes: _txBytes,
        blkNum: _cBlkNum,
        index: _cIndex,
        exitPos: _eUtxoPos
      });
      exit.challengeCount++;
    }

    function checkTx(
      bytes32 root,
      bytes _txBytes,
      bytes _txInfos,
      TxVerification.Amount[] values,
      TxVerification.Tx transaction
    )
      private
      pure
    {
      if(transaction.inputs.length == 0) {
        // deposit transaction
        require(root == keccak256(getSlot(values[0])));
      } else {
        RLP.RLPItem[] memory txList = RLP.toList(RLP.toRlpItem(_txInfos));
        bytes32 txHash = keccak256(_txBytes);
        checkInclusion(
          root,
          txHash,
          RLP.toBytes(txList[0]),
          values
        );
        TxVerification.verifyTransaction(transaction, txHash, RLP.toBytes(txList[1]));
        if(transaction.inputs.length >= 2) {
          require(
            checkConfSigs(
              getTxOwners(transaction),
              RLP.toBytes(txList[2]),
              keccak256(txHash, root)
            ) == true
          );
        }
      }
    }

    /**
     * @dev tx include in exit
     */
    function withinRange(
      TxVerification.Amount[] values,
      ExitTxo memory exitTxo
    )
      private
      view
      returns (bool)
    {
      for(uint j = 0;j < values.length;j++) {
        for(uint k = 0;k < exitTxo.values.length;k += 2) {
          if(!(values[j].end < exitTxo.values[k] || exitTxo.values[k + 1] < values[j].start)) {
            return true;
          }
        }
      }
      return false;
    }

    function getSlot(
      TxVerification.Amount value
    )
      pure
      returns (uint256)
    {
      uint256 start = value.start / CHUNK_SIZE;
      return start;
    }

    function getIndex(
      TxVerification.Amount value
    )
      pure
      returns (uint256, uint256)
    {
      uint256 start = value.start / CHUNK_SIZE;
      uint256 end = value.end / CHUNK_SIZE;
      return (start, end);
    }

    /**
     * @dev respond parent tx of exiting tx
     */
    function respondParent(
      address _chain,
      uint256 _rIndex,
      uint256 _rBlkNum,
      uint256 _eUtxoPos,
      uint256 _challengePos,
      bytes _txBytes,
      bytes _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      var challenge = childChain.challenges[_challengePos];
      var challengeTx = TxVerification.getTx(challenge.txBytes);
      var respondTx = TxVerification.getTx(_txBytes);
      checkTx(
        childChain.blocks[_rBlkNum].root,
        _txBytes,
        _txInfos,
        respondTx.inputs[_rIndex].value,
        respondTx
      );
      require(keccak256TxOutput(respondTx.outputs[_rIndex]) == keccak256ExitTxo(exit.input));
      if(_rBlkNum < challenge.blkNum) {
        delete childChain.challenges[_challengePos];
        exit.challengeCount--;
      }
      exit.input = ExitTxo({
        owners: respondTx.inputs[0].owners,
        values: flatten(respondTx.inputs[0].value),
        state: respondTx.inputs[0].stateBytes
      });
    }

    /**
     * @dev respond spent tx of challenge tx
     * @param _txInfos txBytes, proof, sigs, confsigs
     */
    function respondChallenge(
      address _chain,
      uint256 _rIndex,
      uint256 _rBlkNum,
      uint256 _eUtxoPos,
      uint256 _challengePos,
      bytes _txBytes,
      bytes _txInfos
    )
      public
    {
      ChildChain childChain = childChains[_chain];
      Exit exit = childChain.exits[_eUtxoPos];
      var challenge = childChain.challenges[_challengePos];
      var challengeTx = TxVerification.getTx(challenge.txBytes);
      require(_rBlkNum > challenge.blkNum);
      var respondTx = TxVerification.getTx(_txBytes);
      checkTx(
        childChain.blocks[_rBlkNum].root,
        _txBytes,
        _txInfos,
        respondTx.inputs[_rIndex].value,
        respondTx
      );
      require(keccak256TxOutput(respondTx.inputs[_rIndex]) == keccak256TxOutput(challengeTx.outputs[challenge.index]));
      delete childChain.challenges[_challengePos];
      exit.challengeCount--;
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
        && currentExit.challengeCount == 0) {
        // state specific withdrawal
        if(currentExit.output.owners.length == 1) {
          for(uint i = 0;i < currentExit.output.values.length;i += 2) {
            withdrawValue(
              childChain,
              currentExit,
              currentExit.output.values[i],
              currentExit.output.values[i + 1]);
          }
        }
        delete childChain.exits[_utxoPos];
      }
    }

    function withdrawValue(
      ChildChain storage childChain,
      Exit memory currentExit,
      uint start,
      uint end
    )
      private
    {
      uint slot = start / CHUNK_SIZE;
      uint slotEnd = end / CHUNK_SIZE;

      for(uint j = slot;j <= slotEnd;j++) {
        Coin coin = childChain.coins[j];
        for(uint k = 0;k < childChain.coins[j].nWithdrawals;k++) {
          require(
            !(end < childChain.coins[j].withdrawals[k].start
            || childChain.coins[j].withdrawals[k].end < start));
        }
        if(start <= j * CHUNK_SIZE && (j+1) * CHUNK_SIZE <= end) {
          delete childChain.coins[j];
          // coin.token
          currentExit.output.owners[0].transfer(CHUNK_SIZE);
        }else{
          uint lstart = start;
          uint lend = end;
          if(start <= j * CHUNK_SIZE) {
            lstart = j * CHUNK_SIZE;
            lend = end;
          }else if((j+1) * CHUNK_SIZE <= end) {
            lstart = start;
            lend = (j+1) * CHUNK_SIZE;
          }
          coin.withdrawals[coin.nWithdrawals] = Segment({
            start: lstart,
            end: lend
          });
          currentExit.output.owners[0].transfer(lend - lstart);
          coin.nWithdrawals++;
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
        returns (address[], uint256[], bytes, uint8)
    {
      ChildChain childChain = childChains[_chain];
      return (
        childChain.exits[_utxoPos].output.owners,
        childChain.exits[_utxoPos].output.values,
        childChain.exits[_utxoPos].output.state,
        childChain.exits[_utxoPos].challengeCount
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
      TxVerification.TxState _input,
      TxVerification.TxState _utxo,
      uint256 _blkNum,
      uint256 _created_at
    )
      private
    {
      uint256 _utxoPos = _blkNum * 1000000 + (_utxo.value[0].start / CHUNK_SIZE);
      uint256 exitableAt = Math.max(_created_at + 1 weeks, block.timestamp + 1 weeks);
      uint256[] memory values = new uint256[](_utxo.value.length * 2);
      for(uint c = 0; c < _utxo.value.length; c++) {
        var (start, end) = getIndex(_utxo.value[c]);
        values[c*2] = _utxo.value[c].start;
        values[c*2 + 1] = _utxo.value[c].end;
        for(uint j = start; j <= end; j++) {
          childChains[_chain].coins[j].exit = _utxoPos;
        }
      }
      childChains[_chain].exits[_utxoPos] = Exit({
        blkNum: _blkNum,
        exitableAt: exitableAt,
        input: ExitTxo({
          owners: _input.owners,
          values: flatten(_input.value),
          state: _input.stateBytes
        }),
        output: ExitTxo({
          owners: _utxo.owners,
          values: values,
          state: _utxo.stateBytes
        }),
        challengeCount: 0
      });
      emit ExitStarted(msg.sender, _utxo);
    }

  function flatten(TxVerification.Amount[] amounts)
    private
    pure
    returns (uint256[])
  {
    uint256[] memory values = new uint256[](amounts.length * 2);
    for(uint c = 0; c < amounts.length; c++) {
      values[c*2] = amounts[c].start;
      values[c*2 + 1] = amounts[c].end;
    }
    return values;
  }


  function keccak256ExitTxo(ExitTxo txo)
    private
    pure
    returns (bytes32)
  {
    return keccak256(txo.owners, txo.values, txo.state);
  }

  function keccak256TxOutput(TxVerification.TxState output)
    private
    pure
    returns (bytes32)
  {
    uint256[] memory values = flatten(output.value);
    return keccak256(output.owners, values, output.stateBytes);
  }

}
