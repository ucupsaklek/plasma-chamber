pragma solidity ^0.4.24;

import "./ByteUtils.sol";
import "./ECRecovery.sol";
import "./RLP.sol";
import "./TxVerification.sol";

/**
 * @title Poker
 */
library Poker {

  function multisig(TxVerification.Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    bytes32 h1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.args[0]));
    bytes32 h2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.args[1]));
    bytes32 o1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.outputs[0].state[1]));
    bytes32 o2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.outputs[0].state[2]));
    require(o1
     == h1);
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
    bytes32 o1 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.outputs[0].state[1]));
    bytes32 o2 = ByteUtils.bytesToBytes32(RLP.toBytes(transaction.outputs[0].state[2]));
    require(keccak256(p1) == h1 && keccak256(p2) == h2);
    require(o1 == p1);
    require(o2 == p2);
    // TODO: check owner and value
  }

  function multisigEnd(TxVerification.Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    bytes memory cards1 = RLP.toBytes(transaction.inputs[0].state[1]);
    bytes memory cards2 = RLP.toBytes(transaction.inputs[0].state[2]);
    uint8 rank1 = oddsCal(cards1);
    uint8 rank2 = oddsCal(cards2);
    address userA = transaction.inputs[0].owners[0];
    address userB = transaction.inputs[0].owners[1];
    if(rank1 > rank2) {
      require(transaction.outputs[0].owners[0] == userA);
      require(transaction.outputs[1].owners[0] == userA);
    }else if(rank1 < rank2) {
      require(transaction.outputs[0].owners[0] == userB);
      require(transaction.outputs[1].owners[0] == userB);
    }else{
      require(transaction.outputs[0].owners[0] == userA);
      require(transaction.outputs[1].owners[0] == userB);
    }
  }

  function oddsCal(bytes a)
    internal
    pure
    returns (uint8)
  {
    bool r3 = false;
    uint8 r2 = 0;
    for (uint i = 0;i < 13;i++) {
      uint8 r = (a & (0x8004002001 << i));
      if (r >= 3) {
        // 3 card
        r3 = true;
      } else if(r >= 2) {
        // pair
        r2 += 1;
      }
    }
    bytes13 s = bytes13((a & (0x1FFF)) | (a & (0x1FFF << 13)) | (a & (0x1FFF << 26)) | (a & (0x1FFF << 39)));
    for (uint j = 0;j < 8;j++) {
      if(bool(s & (0x0f << j))) {
        // straight
        return 5;
      }
    }
    if(
      bool(a & 0x1FFF) || bool(a & (0x1FFF << 13)) || bool(a & (0x1FFF << 26)) || bool(a & (0x1FFF << 39))) {
        // flush
        return 6;
    }else{
      if(r3) {
        if(r2 == 1) {
          // full house
          return 7;
        }else{
          // 3 card
          return 4;
        }
      }else{
        if(r2 == 1) {
          // 1 pair
          return 2;
        }else if(r2 == 2) {
          // 2 pair
          return 3;
        }
      }
    }
  }

}