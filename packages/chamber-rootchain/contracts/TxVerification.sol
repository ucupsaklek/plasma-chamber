pragma solidity ^0.4.24;

import "./ByteUtils.sol";
import "./ECRecovery.sol";
import "./RLP.sol";
import "./MultisigGame.sol";

/**
 * @title TxVerification
 * @dev check tx
 */
library TxVerification {

  /*
   * standard structure
   */
  struct Amount {
    uint256 start;
    uint256 end;
  }

  struct TxState {
    address[] owners;
    Amount[] value;
    RLP.RLPItem[] state;
    bytes stateBytes;
    uint256 blkNum;
  }

  struct Tx {
    address verifier;
    uint256 label;
    RLP.RLPItem[] args;
    TxState[] inputs;
    TxState[] outputs;
  }

  enum AppStateStd {
    AppStateStdOwn,
    AppStateStdMultiSig
  }

  /*
   * common functions
   */

  function checkSigs(address[] owners, bytes sigs, bytes32 txHash)
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

  function getAmount(RLP.RLPItem memory amountItem)
    internal
    pure
    returns (Amount)
  {
    RLP.RLPItem[] memory amountList = RLP.toList(amountItem);
    return Amount({
      start: RLP.toUint(amountList[0]),
      end: RLP.toUint(amountList[1])
    });
  }

  /**
   * @dev tx input bytes to TxInput
   * @param txState txState
   */
  function getTxInput(RLP.RLPItem memory txState)
    internal
    pure
    returns (TxState)
  {
    RLP.RLPItem[] memory txStateList = RLP.toList(txState);
    RLP.RLPItem[] memory ownerList = RLP.toList(txStateList[0]);
    RLP.RLPItem[] memory valueList = RLP.toList(txStateList[1]);
    address[] memory owners = new address[](ownerList.length);
    Amount[] memory values = new Amount[](valueList.length);
    uint i = 0;
    for (i = 0; i < ownerList.length; i++) {
      owners[i] = RLP.toAddress(ownerList[i]);
    }
    for (i = 0; i < valueList.length; i++) {
      values[i] = getAmount(valueList[i]);
    }
    return TxState({
      owners: owners,
      value: values,
      state: RLP.toList(txStateList[2]),
      stateBytes: RLP.listAsBytes(txStateList[2]),
      blkNum: RLP.toUint(txStateList[3])
    });
  }

  /**
   * @dev txStateBytes to txState
   * @param txState txState
   */
  function getTxState(RLP.RLPItem memory txState)
    internal
    pure
    returns (TxState)
  {
    RLP.RLPItem[] memory txStateList = RLP.toList(txState);
    RLP.RLPItem[] memory ownerList = RLP.toList(txStateList[0]);
    RLP.RLPItem[] memory valueList = RLP.toList(txStateList[1]);
    address[] memory owners = new address[](ownerList.length);
    Amount[] memory values = new Amount[](valueList.length);
    uint i = 0;
    for (i = 0; i < ownerList.length; i++) {
      owners[i] = RLP.toAddress(ownerList[i]);
    }
    for (i = 0; i < valueList.length; i++) {
      values[i] = getAmount(valueList[i]);
    }
    return TxState({
      owners: owners,
      value: values,
      state: RLP.toList(txStateList[2]),
      stateBytes: RLP.listAsBytes(txStateList[2]),
      blkNum: 0
    });
  }

  /**
   * @dev txBytes to tx
   * @param txByte txByte
   */
  function getTx(bytes txByte)
    internal
    pure
    returns (Tx)
  {
    var txList = RLP.toList(RLP.toRlpItem(txByte));
    RLP.RLPItem[] memory inputList = RLP.toList(txList[3]);
    RLP.RLPItem[] memory outputList = RLP.toList(txList[4]);
    TxState[] memory inputs = new TxState[](inputList.length);
    TxState[] memory outputs = new TxState[](outputList.length);
    for (uint i = 0; i < inputList.length; i++) {
      inputs[i] = getTxInput(inputList[i]);
    }
    for (uint j = 0; j < outputList.length; j++) {
      outputs[j] = getTxState(outputList[j]);
    }
    return Tx({
      verifier: RLP.toAddress(txList[0]),
      label: RLP.toUint(txList[1]),
      args: RLP.toList(txList[2]),
      inputs: inputs,
      outputs: outputs
    });
  }

  function getAppStateStd(RLP.RLPItem[] appStateList)
    internal
    pure
    returns (AppStateStd)
  {
    uint256 i = RLP.toUint(appStateList[0]);
    if(i == 0) {
      return AppStateStd.AppStateStdOwn;
    }else{
      return AppStateStd.AppStateStdMultiSig;
    }
  }

  /*
   * application specific functions 
   */

  function verifyTransaction(
    Tx transaction,
    bytes txBytes,
    bytes32 txHash,
    bytes32 merkleHash,
    bytes sigs,
    bytes confsigs
  )
    internal
    view
  {
    if(transaction.verifier == address(0)) {
      if(transaction.label == 0) {
        transfer(transaction, txHash, sigs);
      }else if(transaction.label == 1) {
        split(transaction, txHash, sigs);
      }else if(transaction.label == 2) {
        exchange(transaction);
      }
    } else {
      transaction.verifier.call('verify', txBytes, txHash, sigs);
    }
  }

  /**
   * @dev change owner
   */
  function transfer(Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    address counter = RLP.toAddress(transaction.args[0]);
    require(RLP.toUint(transaction.inputs[0].state[0]) == 0);
    require(transaction.inputs[0].owners[0] == ECRecovery.recover(txHash, sigs));
    require(transaction.outputs[0].owners[0] == counter);
  }

  /**
   * @dev split value
   */
  function split(Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    address counter = RLP.toAddress(transaction.args[0]);
    uint amount = RLP.toUint(transaction.args[1]);
    require(RLP.toUint(transaction.inputs[0].state[0]) == 0);
    require(transaction.inputs[0].owners[0] == ECRecovery.recover(txHash, sigs));
    require(transaction.outputs[0].owners[0] == counter);
    require(transaction.outputs[1].owners[0] == transaction.inputs[0].owners[0]);
    Amount memory amount0 = transaction.outputs[0].value[0];
    Amount memory amount1 = transaction.outputs[1].value[0];
    require(amount0.end - amount0.start == amount);
    require(amount0.start + amount == amount1.start);
    require(transaction.inputs[0].value[0].end == amount1.end);
  }

  function exchange(Tx transaction)
    internal
    pure
  {
    TxState memory preState1 = transaction.inputs[0];
    TxState memory preState2 = transaction.inputs[1];
    TxState memory afterState1 = transaction.outputs[0];
    TxState memory afterState2 = transaction.outputs[1];

    require(preState1.owners[0] == afterState2.owners[0]);
    require(preState2.owners[0] == afterState1.owners[0]);
    require(preState1.value[0].start == afterState1.value[0].start);
    require(preState2.value[0].start == afterState2.value[0].start);
  }

  function verifyWithdrawal(address[] owners, uint256 uid, bytes stateBytes)
    internal
    pure
    returns (bool)
  {
    var stdState = getAppStateStd(RLP.toList(RLP.toRlpItem(stateBytes)));
    if(stdState == AppStateStd.AppStateStdOwn) {
      return true;
    }
    return false;
  }

}
