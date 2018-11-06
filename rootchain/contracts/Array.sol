pragma solidity ^0.4.24;

library Array {

  function contains(
    address[] arr,
    address target
  )
    internal
    pure
    returns (bool)
  {
    for(uint i = 0;i < arr.length;i++) {
      if (arr[i] == target) return true;
    }
    return false;
  }

}