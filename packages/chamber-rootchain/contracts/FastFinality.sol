
pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./lib/ECRecovery.sol";
import "./TxDecoder.sol";

/**
 * @title FastFinality contract
 */
contract FastFinality {

  /*
    * Storage
    */
  struct Dispute {
    address recipient;
    uint256 withdrawableAt;
    uint256 amount;
    bool isUsed;
  }

  uint256 totalAmount = 0;
  mapping (address => uint256) deposits;
  address operatorAddress;
  mapping (bytes32 => Dispute) disputes;
  address rootchain;

  /*
    * Constructor
    */

  constructor(address _rootchain)
    public
  {
    operatorAddress = msg.sender;
    rootchain = _rootchain;
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
  function dispute(
    bytes txBytes,
    bytes operatorSigs,
    uint index
  )
    public
    returns (bool)
  {
    // check operator's signatures
    bytes32 txHash = keccak256(txBytes);
    require(!disputes[txHash].isUsed && disputes[txHash].withdrawableAt == 0);
    require(operatorAddress == ECRecovery.recover(txHash, operatorSigs));
    var transaction = TxDecoder.getTx(txBytes);
    require(transaction.outputs[index].owners[0] == msg.sender);
    uint256 amount = 0;
    for(uint i = 0;i < transaction.outputs[index].value.length;i++) {
      amount += transaction.outputs[index].value[i].end - transaction.outputs[index].value[i].start;
    }
    disputes[txHash] = Dispute({
      recipient: msg.sender,
      withdrawableAt: block.timestamp,
      amount: amount,
      isUsed: false
    });
    return true;
  }

  /**
    * @dev 
    * @param txInfos txInfos include proof, signatures and confsig
    *     and confsig can be empty.
    *     [
    *      <merkle_proof_of_transactions>,
    *      <signature>,
    *      <confsig>
    *     ]
    */
  function challenge(
    uint disputePos,
    uint256 index,
    uint256 blkNum,
    bytes txBytes,
    bytes txInfos
  )
    public
    returns (bool)
  {
    // check inclusion
    rootchain.call(
      'checkTxPublic',
      index,
      blkNum,
      txBytes,
      txInfos);
    bytes32 txHash = keccak256(txBytes);
    disputes[txHash].isUsed = true;
    return true;
  }

  /**
    * @dev 
    */
  function finalizeDispute(
    bytes32 txHash
  )
    public
    returns (bool)
  {
    // finalize dispute after 7 days
    disputes[txHash].recipient.transfer(disputes[txHash].amount);
    disputes[txHash].isUsed = true;
    return true;
  }


}
