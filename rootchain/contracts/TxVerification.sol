pragma solidity ^0.4.24;

import "./ByteUtils.sol";
import "./ECRecovery.sol";
import "./RLP.sol";

/**
 * @title TxVerification
 * @dev check tx
 */
library TxVerification {

  /*
   * standard structure
   */
  struct PlasmaValue {
    address assetId;
    uint256 amount;
  }

  struct TxState {
    address[] owners;
    PlasmaValue[] values;
    RLP.RLPItem[] state;
  }

  struct Tx {
    bytes32 id;
    uint256 label;
    RLP.RLPItem[] args;
    TxState[] inputs;
    TxState[] outputs;
  }

  enum AppStateStd {
    AppStateStdOwn,
    AppStateStdMultiSig
  }

  struct AppStateStdOrderBook {
    address assetId;
    uint256 amount;
  }

  /*
   * application specific structure
   */
  struct AppStateTictactoe {
    uint256 map1;
    uint256 map2;
    uint256 map3;
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

  function getPlasmaValue(RLP.RLPItem memory valueItem)
    internal
    pure
    returns (PlasmaValue)
  {
    RLP.RLPItem[] memory valueList = RLP.toList(valueItem);
    return PlasmaValue({
      assetId: RLP.toAddress(valueList[0]),
      amount: RLP.toUint(valueList[1])
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
    address[] memory owners;
    PlasmaValue[] memory values;
    RLP.RLPItem[] memory txStateList = RLP.toList(txState);
    RLP.RLPItem[] memory ownerList = RLP.toList(txStateList[0]);
    RLP.RLPItem[] memory valueList = RLP.toList(txStateList[1]);
    uint i = 0;
    for (i = 0; i < ownerList.length; i++) {
      owners[i] = RLP.toAddress(ownerList[i]);
    }
    for (i = 0; i < valueList.length; i++) {
      values[i] = getPlasmaValue(valueList[i]);
    }
    return TxState({
      owners: owners,
      values: values,
      state: RLP.toList(txStateList[2])
    });
  }

  function getTxOwners(Tx memory transaction)
    internal
    pure
    returns (address[] memory)
  {
    address[] memory owners;
    for(uint i = 0; i < transaction.inputs.length; i++) {
      for(uint j = 0; j < transaction.inputs[i].owners.length; j++) {
        owners[i * transaction.inputs.length + j] = transaction.inputs[i].owners[j];
      }
    }
    return owners;
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
    TxState[] memory inputs;
    TxState[] memory outputs;
    RLP.RLPItem[] memory inputList = RLP.toList(txList[3]);
    RLP.RLPItem[] memory outputList = RLP.toList(txList[4]);
    for (uint i = 0; i < inputList.length; i++) {
      inputs[i] = getTxState(inputList[i]);
    }
    for (uint j = 0; j < outputList.length; j++) {
      outputs[j] = getTxState(outputList[j]);
    }
    return Tx({
      id: ByteUtils.bytesToBytes32(RLP.toBytes(txList[0])),
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

  function getAppStateStdOrderBook(RLP.RLPItem[] appStateList)
    internal
    pure
    returns (AppStateStdOrderBook)
  {
    return AppStateStdOrderBook({
      assetId: RLP.toAddress(appStateList[0]),
      amount: RLP.toUint(appStateList[1])
    });
  }

  function getAppStateTictactoe(RLP.RLPItem[] appStateList)
    internal
    pure
    returns (AppStateTictactoe)
  {
    return AppStateTictactoe({
      map1: RLP.toUint(appStateList[0]),
      map2: RLP.toUint(appStateList[1]),
      map3: RLP.toUint(appStateList[2])
    });
  }

  /*
   * application specific functions 
   */

  function validateTransaction(bytes txBytes, bytes sigs)
    internal
    pure
    returns (bytes)
  {
    Tx memory transaction = getTx(txBytes);
    address[] memory owners = getTxOwners(transaction);
    require(checkSigs(owners, sigs, sha256(txBytes)) == true);
    if(transaction.label == 0) {
      transfer(transaction);
    }else if(transaction.label == 1) {
      exchange(transaction);
    }else if(transaction.label == 100) {
      updateReverseStatus(transaction);
    }
  }

  /**
   * @dev change owner
   */
  function transfer(Tx transaction)
    internal
    pure
  {
    address counter = RLP.toAddress(transaction.args[0]);
    require(transaction.outputs[0].owners[0] == counter);
  }

  /**
   * @dev split value
   */
  function updateReverseStatus(Tx transaction)
    internal
    pure
  {
  }


  function exchange(Tx transaction)
    internal
    pure
  {
    TxState memory preState1 = transaction.inputs[0];
    TxState memory preState2 = transaction.inputs[1];
    TxState memory afterState1 = transaction.outputs[0];
    TxState memory afterState2 = transaction.outputs[1];
    AppStateStdOrderBook memory orderbookState = getAppStateStdOrderBook(preState1.state);

    require(orderbookState.assetId == preState2.values[0].assetId);
    require(orderbookState.amount == preState2.values[0].amount);
    require(preState1.owners[0] == afterState2.owners[0]);
    require(preState2.owners[0] == afterState1.owners[0]);
    require(preState1.values[0].amount == afterState1.values[0].amount);
    require(preState2.values[0].amount == afterState2.values[0].amount);
  }

}
