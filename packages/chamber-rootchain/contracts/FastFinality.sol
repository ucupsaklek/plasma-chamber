
pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;


/**
 * @title FastFinality contract
 */
contract FastFinality {

  /*
    * Storage
    */
  uint256 totalAmount = 0;
  mapping (address => uint256) deposits;

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
    * @dev deposit by operator
    */
  function deposit()
    public
    payable
    returns (bool)
  {
    totalAmount += msg.value;
    return true;
  }

  /**
    * @dev buy bandwidth by merchant
    */
  function buyBandwidth()
    public
    returns (bool)
  {
    require(totalAmount >= msg.value);
    deposits[msg.sender] = msg.value;
    totalAmount -= msg.value;
    return true;
  }


  /**
    * @dev 
    */
  function dispute(bytes txBytes, bytes sigs)
    public
    returns (bool)
  {
    // check sender and operator's signatures
    return true;
  }

  /**
    * @dev 
    */
  function challenge(uint disputePos, bytes proof)
    public
    returns (bool)
  {
    // check inclusion
    return true;
  }

  /**
    * @dev 
    */
  function finalizeDispute()
    public
    returns (bool)
  {
    // finalize dispute after 7 days
    return true;
  }


}
