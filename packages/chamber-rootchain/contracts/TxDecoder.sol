pragma solidity ^0.4.24;

import "./lib/RLP.sol";

library TxDecoder {

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

  /*
   * common functions
   */
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

  function _decodeValues(
    RLP.RLPItem[] memory valueList
  )
    internal
    pure
    returns (Amount[])
  {
    Amount[] memory values = new Amount[](valueList.length);
    for (uint i = 0; i < valueList.length; i++) {
      values[i] = getAmount(valueList[i]);
    }
    return values;
  }

  function _decodeOwners(
    RLP.RLPItem[] memory ownerList
  )
    internal
    pure
    returns (address[])
  {
    address[] memory owners = new address[](ownerList.length);
    for (uint i = 0; i < ownerList.length; i++) {
      owners[i] = RLP.toAddress(ownerList[i]);
    }
    return owners;
  }

  /**
   * @dev tx input bytes to TxInput
   * @param txState txState
   */
  function _decodeTxState(RLP.RLPItem memory txState)
    internal
    pure
    returns (TxState)
  {
    RLP.RLPItem[] memory txStateList = RLP.toList(txState);
    uint blkNum = 0;
    if(txStateList.length > 3) {
      blkNum = RLP.toUint(txStateList[3]);
    }
    return TxState({
      owners: _decodeOwners(RLP.toList(txStateList[0])),
      value: _decodeValues(RLP.toList(txStateList[1])),
      state: RLP.toList(txStateList[2]),
      stateBytes: RLP.listAsBytes(txStateList[2]),
      blkNum: blkNum
    });
  }

  function _decodeTxStates(
    RLP.RLPItem[] memory inputList
  )
    internal
    pure
    returns (TxState[])
  {
    TxState[] memory inputs = new TxState[](inputList.length);
    for (uint i = 0; i < inputList.length; i++) {
      inputs[i] = _decodeTxState(inputList[i]);
    }
    return inputs;
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
    return Tx({
      verifier: RLP.toAddress(txList[0]),
      label: RLP.toUint(txList[1]),
      args: RLP.toList(txList[2]),
      inputs: _decodeTxStates(RLP.toList(txList[3])),
      outputs: _decodeTxStates(RLP.toList(txList[4]))
    });
  }

}