pragma solidity ^0.4.24;

import "./ByteUtils.sol";
import "./ECRecovery.sol";
import "./RLP.sol";
import "./TxVerification.sol";

/**
 * @title MultisigGame
 * @dev stone scissor paper 
 */
contract MultisigGame {

   function multisig(TxVerification.Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    bytes32 h1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.args[0]));
    bytes32 h2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.args[1]));
    bytes32 o1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.outputs[0].state[1]));
    bytes32 o2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.outputs[0].state[2]));
    require(o1 == h1);
    require(o2 == h2);
    // TODO: check owner and value
  }

  function reveal(TxVerification.Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    bytes32 h1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.inputs[0].state[1]));
    bytes32 h2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.inputs[0].state[2]));
    bytes32 p1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.args[0]));
    bytes32 p2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.args[1]));
    address userA = transaction.inputs[0].owners[0];
    address userB = transaction.inputs[0].owners[1];
    require(keccak256(p1) == h1 && keccak256(p2) == h2);
    // p1 p2
    uint r1 = uint8(p1) % 3;
    uint r2 = uint8(p2) % 3;
    if(r1 > r2 || (r1 == 0 && r2 == 2)) {
      require(transaction.outputs[0].owners[0] == userA);
      require(transaction.outputs[1].owners[0] == userA);
    }else if(r1 == r2) {
      require(transaction.outputs[0].owners[0] == userA);
      require(transaction.outputs[1].owners[0] == userB);
    }else{
      require(transaction.outputs[0].owners[0] == userB);
      require(transaction.outputs[1].owners[0] == userB);
    }
  }
}
