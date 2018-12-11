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

  function verify(Tx transaction, bytes32 txHash, bytes sigs)
    internal
    pure
  {
    if(transaction.label == 21) {
      multisig(transaction, txHash, sigs);
    }else if(transaction.label == 22) {
      reveal(transaction, txHash, sigs);
    }
  }

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

  function updateReverseStatus(Tx transaction)
    internal
    pure
  {
    TxState memory input = transaction.inputs[0];
    TxState memory output = transaction.outputs[0];
    var appState = getAppStateTictactoe(input.state);
    var nextAppState = getAppStateTictactoe(output.state);
    require(appState.currentPlayer == input.owners[0]);
    require(appState.nextPlayer == output.owners[0]);
    uint pos = RLP.toUint(transaction.args[0]);
    uint spos = RLP.toUint(transaction.args[1]);
    uint posState = gameGetPos(appState.map, pos);
    require(posState == 0);
    uint256 newMap = appState.map + ((3**pos)*spos);
    uint winner = gameIsWin(newMap);
    if(winner > 0) {
      require(nextAppState.winner == winner);
    }else{
      require(nextAppState.map == newMap);
    }
  }

  function getAppStateTictactoe(RLP.RLPItem[] appStateList)
    internal
    pure
    returns (AppStateTictactoe)
  {
    return AppStateTictactoe({
      currentPlayer: RLP.toAddress(appStateList[0]),
      nextPlayer: RLP.toAddress(appStateList[1]),
      map: RLP.toUint(appStateList[2]),
      winner: RLP.toUint(appStateList[3])
    });
  }

  function gameIsWin(uint256 map)
    internal
    pure
    returns (uint)
  {
    uint256[] memory tmpMap = new uint256[](9);
    tmpMap[0] = map;
    uint8 i = 1;
    for(i = 1; i < 9; i++) {
      tmpMap[i] = tmpMap[i - 1] / 3;
    }
    for(i = 0; i < 9; i++) {
      for(uint8 j = i + 1; j < 9; j++) {
        tmpMap[i] -= tmpMap[j] * (3**j);
      }
    }
    if(tmpMap[0] != 0 && tmpMap[0] == tmpMap[1] && tmpMap[1] == tmpMap[2]) {
      return tmpMap[0];
    }
    if(tmpMap[3] != 0 && tmpMap[3] == tmpMap[4] && tmpMap[4] == tmpMap[5]) {
      return tmpMap[3];
    }
    if(tmpMap[6] != 0 && tmpMap[6] == tmpMap[7] && tmpMap[7] == tmpMap[8]) {
      return tmpMap[6];
    }
    if(tmpMap[0] != 0 && tmpMap[0] == tmpMap[3] && tmpMap[3] == tmpMap[6]) {
      return tmpMap[0];
    }
    if(tmpMap[1] != 0 && tmpMap[1] == tmpMap[4] && tmpMap[4] == tmpMap[7]) {
      return tmpMap[1];
    }
    if(tmpMap[2] != 0 && tmpMap[2] == tmpMap[5] && tmpMap[5] == tmpMap[8]) {
      return tmpMap[2];
    }
    if(tmpMap[0] != 0 && tmpMap[0] == tmpMap[4] && tmpMap[4] == tmpMap[8]) {
      return tmpMap[0];
    }
    if(tmpMap[2] != 0 && tmpMap[2] == tmpMap[4] && tmpMap[4] == tmpMap[6]) {
      return tmpMap[2];
    }
    return 0;
  }

  function gameGetPos(uint256 map, uint256 pos)
    internal
    pure
    returns (uint)
  {
    uint256 map3 = map / 27 / 27;
    uint256 map2 = map / 27 - map3 * 27 * 27;
    uint256 map1 = map - map3 * 27 * 27 - map2 * 27;
    if(pos >= 0 && pos < 3) {
      return gameGetPos2(map1, pos);
    } else if(pos < 6) {
      return gameGetPos2(map2, pos - 3);
    } else if(pos < 9) {
      return gameGetPos2(map3, pos - 6);
    }
  }

  function gameGetPos2(uint256 map, uint256 pos)
    internal
    pure
    returns (uint)
  {
    uint256 map1 = map / 3 / 3;
    uint256 map2 = map / 3 - map1 * 3 * 3;
    uint256 map3 = map - map1 * 3 * 3 - map2 * 3;
    if(pos == 0) {
      return map1;
    }else if(pos == 1) {
      return map2;
    }else if(pos == 2) {
      return map3;
    }
  }

}
