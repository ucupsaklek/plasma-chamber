pragma solidity ^0.4.24;

import "./Poker.sol";
import "./TxVerification.sol";

contract PokerTest {

  function multisig(bytes txBytes, bytes sigs)
    public
    pure
  {
    Poker.multisig(TxVerification.getTx(txBytes), keccak256(txBytes), sigs);
  }

}
