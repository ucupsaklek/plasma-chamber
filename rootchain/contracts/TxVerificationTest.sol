pragma solidity ^0.4.24;

import "./TxVerification.sol";

contract TxVerificationTest {

  function verifyTransaction(bytes txBytes, bytes sigs)
    public
    pure
  {
    TxVerification.verifyTransaction(TxVerification.getTx(txBytes), keccak256(txBytes), sigs);
  }

}
