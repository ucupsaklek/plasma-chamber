
pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./RootChain.sol";

/**
 * @title AggregateChain
 */
contract AggregateChain {

    /*
     * Storage
     */
    mapping (address => address) plasmaChains;

    /*
     * Constructor
     */

    constructor()
      public
    {
    }

    /*
     * Public Functions
     */

    /**
     * @dev add child chain.
     * msg.sender is to be the chainId.
     */
    function addChain(address chainAddress)
      public
      returns (address)
    {
      plasmaChains[chainAddress] = chainAddress;
      return chainAddress;
    }

}
