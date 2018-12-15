pragma solidity ^0.4.24;

import "./TxVerification.sol";
import "./TxDecoder.sol";

contract TxVerificationTest {

  function verifyTransaction(bytes txBytes, bytes sigs, bytes confsigs)
    public
    view
  {
    TxVerification.verifyTransaction(
      TxDecoder.getTx(txBytes),
      txBytes,
      keccak256(txBytes),
      keccak256(txBytes),
      sigs,
      confsigs);
  }

}
