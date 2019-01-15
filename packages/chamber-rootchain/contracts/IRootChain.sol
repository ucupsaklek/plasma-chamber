pragma solidity ^0.4.24;

/**
 * @title RootChain interface
 */
interface IRootChain {

  function checkTxPublic(
    uint256 index,
    uint256 blkNum,
    bytes txBytes,
    bytes txInfos
  ) public view returns (bool);

}
