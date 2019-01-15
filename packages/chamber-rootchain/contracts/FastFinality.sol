
pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import "./IRootChain.sol";
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
    uint8 status;
  }

  uint8 public constant STATE_FIRST_DISPUTED = 1;
  uint8 public constant STATE_CHALLENGED = 2;
  uint8 public constant STATE_SECOND_DISPUTED = 3;
  uint8 public constant STATE_FINALIZED = 4;
  
  uint256 totalAmount = 0;
  mapping (address => uint256) deposits;
  address operatorAddress;
  mapping (bytes32 => Dispute) disputes;
  IRootChain rootchain;

  /*
    * Constructor
    */

  constructor(address _rootchain)
    public
  {
    operatorAddress = msg.sender;
    rootchain = IRootChain(_rootchain);
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
    require(disputes[txHash].status == 0 && disputes[txHash].withdrawableAt == 0);
    require(operatorAddress == ECRecovery.recover(txHash, operatorSigs));
    var transaction = TxDecoder.getTx(txBytes);
    require(transaction.outputs[index].owners[0] == msg.sender);
    uint256 amount = 0;
    for(uint i = 0;i < transaction.outputs[index].value.length;i++) {
      amount += transaction.outputs[index].value[i].end - transaction.outputs[index].value[i].start;
    }
    disputes[txHash] = Dispute({
      recipient: msg.sender,
      withdrawableAt: block.timestamp + 1 weeks,
      amount: amount,
      status: STATE_FIRST_DISPUTED
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
    uint256 index,
    uint256 blkNum,
    bytes txBytes,
    bytes txInfos
  )
    public
    returns (bool)
  {
    // check inclusion
    bytes32 txHash = keccak256(txBytes);
    require(disputes[txHash].status == STATE_FIRST_DISPUTED);
    require(rootchain.checkTxPublic(
      index,
      blkNum,
      txBytes,
      txInfos));
    disputes[txHash].status = STATE_CHALLENGED;
    return true;
  }

  /**
    * @dev secondDispute
    * @param txInfos txInfos include proof, signatures and confsig
    *     and confsig can be empty.
    *     [
    *      <merkle_proof_of_transactions>,
    *      <signature>,
    *      <confsig>
    *     ]
    */
  function secondDispute(
    bytes disputeTxBytes,
    uint256 index,
    uint256 blkNum,
    bytes txBytes,
    bytes txInfos
  )
    public
    returns (bool)
  {
    bytes32 txHash = keccak256(disputeTxBytes);
    var disputeTransaction = TxDecoder.getTx(disputeTxBytes);
    var transaction = TxDecoder.getTx(txBytes);
    // check challenge
    require(rootchain.checkTxPublic(
      index,
      blkNum,
      txBytes,
      txInfos));
    require(
      TxDecoder.keccak256TxOutput(disputeTransaction.inputs[0]) == TxDecoder.keccak256TxOutput(transaction.inputs[0]));
    disputes[txHash].status = STATE_SECOND_DISPUTED;
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
    var dispute = disputes[txHash];
    require(dispute.withdrawableAt < block.timestamp);
    if(dispute.status == STATE_FIRST_DISPUTED || dispute.status == STATE_SECOND_DISPUTED) {
      dispute.recipient.transfer(dispute.amount);
      dispute.status = STATE_FINALIZED;
      return true;
    }
    return false;
  }

  /**
    * @dev get dispute
    */
  function getDispute(
    bytes32 txHash
  )
    public
    view
    returns (address, uint256, uint256, uint8)
  {
    return (
      disputes[txHash].recipient,
      disputes[txHash].withdrawableAt,
      disputes[txHash].amount,
      disputes[txHash].status
      );
  }

}
