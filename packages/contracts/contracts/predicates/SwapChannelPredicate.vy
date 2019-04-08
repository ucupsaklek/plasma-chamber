struct SwapChannel:
  participant1: address
  participant2: address
  segment1: uint256
  segment2: uint256
  tokenAddress1: address
  tokenAddress2: address
  amount1: uint256
  amount2: uint256
  withdrawableAt: uint256

#
# Library
#

contract VerifierUtil():
  def ecrecoverSig(
    _txHash: bytes32,
    _sig: bytes[260],
    index: int128
  ) -> address: constant
  def parseSegment(
    segment: uint256
  ) -> (uint256, uint256, uint256): constant
  def isContainSegment(
    segment: uint256,
    small: uint256
  ) -> (bool): constant

contract ERC20:
  def transferFrom(_from: address, _to: address, _value: uint256) -> bool: modifying
  def transfer(_to: address, _value: uint256) -> bool: modifying

channelNonce: public(uint256)
verifierUtil: public(address)
rootChain: public(address)
channels: map(bytes32, SwapChannel)

# @dev Constructor
@public
def __init__(_verifierUtil: address, _rootChain: address):
  self.verifierUtil = _verifierUtil
  self.rootChain = _rootChain
  self.channelNonce = 1

@public
@constant
def decodeState(
  stateBytes: bytes[256]
) -> (uint256, uint256):
  return (
    extract32(stateBytes, 32*1, type=uint256),  # blkNum
    extract32(stateBytes, 32*2, type=uint256)  # segment
  )

@public
@constant
def decodeOwnershipState(
  stateBytes: bytes[256]
) -> (uint256, uint256, address):
  return (
    extract32(stateBytes, 32*1, type=uint256),  # blkNum
    extract32(stateBytes, 32*2, type=uint256),  # segment
    extract32(stateBytes, 32*3, type=address)   # owner
  )


@public
@constant
def decodePaymentChannelState(
  stateBytes: bytes[256]
) -> (uint256, uint256, bytes32, address, address, uint256):
  assert self == extract32(stateBytes, 0, type=address)
  return (
    extract32(stateBytes, 32*1, type=uint256),  # blkNum
    extract32(stateBytes, 32*2, type=uint256),  # segment
    extract32(stateBytes, 32*3, type=bytes32),  # hash of channels
    extract32(stateBytes, 32*4, type=address),  # participant
    extract32(stateBytes, 32*5, type=address),  # participant
    extract32(stateBytes, 32*6, type=uint256),  # index
  )

@private
@constant
def canInitiateExit(
  _txHash: bytes32,
  _stateUpdate: bytes[256],
  _owner: address,
  _segment: uint256
) -> (bool):
  blkNum: uint256
  segment: uint256
  hashOfChannels: bytes32
  participant1: address
  participant2: address
  segmentIndex: uint256
  (blkNum, segment, hashOfChannels, participant1, participant2, segmentIndex) = self.decodePaymentChannelState(_stateUpdate)
  if _owner != ZERO_ADDRESS:
    assert _owner == participant1 or _owner == participant2
  assert VerifierUtil(self.verifierUtil).isContainSegment(segment, _segment)
  return True

@public
@constant
def verifyDeprecation(
  _txHash: bytes32,
  _stateBytes: bytes[256],
  _nextStateUpdate: bytes[256],
  _transactionWitness: bytes[130],
  _timestamp: uint256
) -> (bool):
  blkNum: uint256
  exitSegment: uint256
  hashOfChannels: bytes32
  segmentIndex: uint256
  participant1: address
  participant2: address
  challengeSegment: uint256
  challengeBlkNum: uint256
  (blkNum, exitSegment, hashOfChannels, participant1, participant2, segmentIndex) = self.decodePaymentChannelState(_stateBytes)
  (challengeBlkNum, challengeSegment) = self.decodeState(_nextStateUpdate)
  assert VerifierUtil(self.verifierUtil).isContainSegment(exitSegment, challengeSegment)
  assert VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _transactionWitness, 0) == participant1
  assert VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _transactionWitness, 1) == participant2
  return True

@public
def finalizeExit(
  _stateBytes: bytes[256],
  _tokenAddress: address,
  _amount: uint256
):
  blkNum: uint256
  exitSegment: uint256
  hashOfChannels: bytes32
  segmentIndex: uint256
  participant1: address
  participant2: address
  tokenId: uint256
  start: uint256
  end: uint256
  (blkNum, exitSegment, hashOfChannels, participant1, participant2, segmentIndex) = self.decodePaymentChannelState(_stateBytes)
  if self.channels[hashOfChannels].participant1 == ZERO_ADDRESS:
    self.channels[hashOfChannels] = SwapChannel({
      participant1: participant1,
      participant2: participant2,
      segment1: 0,
      segment2: 0,
      tokenAddress1: ZERO_ADDRESS,
      tokenAddress2: ZERO_ADDRESS,
      amount1: 0,
      amount2: 0,
      withdrawableAt: as_unitless_number(block.timestamp) + 60 * 60 * 24 * 3
    })
  else:
    pass
  if segmentIndex == 1:
    assert self.channels[hashOfChannels].amount1 == 0
    self.channels[hashOfChannels].segment1 = exitSegment
    self.channels[hashOfChannels].tokenAddress1 = _tokenAddress
    self.channels[hashOfChannels].amount1 = _amount
  elif segmentIndex == 2:
    assert self.channels[hashOfChannels].amount2 == 0
    self.channels[hashOfChannels].segment2 = exitSegment
    self.channels[hashOfChannels].tokenAddress2 = _tokenAddress
    self.channels[hashOfChannels].amount2 = _amount
  else:
    pass

@public
def dispute(
  _channelId: bytes32,
  _stateUpdate: bytes[256],
  _transactionWitness: bytes[130]
):
  blkNum: uint256
  disputeSegment: uint256
  owner: address
  (blkNum, disputeSegment, owner) = self.decodeOwnershipState(_stateUpdate)
  ch: SwapChannel = self.channels[_channelId]
  txHash: bytes32 = sha3(_stateUpdate)
  if ch.participant1 == owner:
    assert VerifierUtil(self.verifierUtil).isContainSegment(ch.segment2, disputeSegment)
  elif ch.participant2 == owner:
    assert VerifierUtil(self.verifierUtil).isContainSegment(ch.segment1, disputeSegment)
  else:
    assert False
  assert VerifierUtil(self.verifierUtil).ecrecoverSig(txHash, _transactionWitness, 0) == ch.participant1
  assert VerifierUtil(self.verifierUtil).ecrecoverSig(txHash, _transactionWitness, 1) == ch.participant2
  participant: address = ch.participant2
  self.channels[_channelId].participant1 = participant
  self.channels[_channelId].participant2 = ch.participant1

@public
def finalizeChannel(
  _channelId: bytes32
):
  ch: SwapChannel = self.channels[_channelId]
  assert ch.withdrawableAt > as_unitless_number(block.timestamp)
  if ch.tokenAddress1 == ZERO_ADDRESS:
    send(ch.participant1, as_wei_value(ch.amount1, "wei"))
    pass
  else:
    assert ERC20(ch.tokenAddress1).transfer(ch.participant1, ch.amount1)
  if ch.tokenAddress2 == ZERO_ADDRESS:
    send(ch.participant2, as_wei_value(ch.amount2, "wei"))
    pass
  else:
    assert ERC20(ch.tokenAddress2).transfer(ch.participant2, ch.amount2)
  clear(self.channels[_channelId])
