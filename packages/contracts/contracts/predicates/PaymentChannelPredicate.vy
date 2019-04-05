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

verifierUtil: public(address)

# @dev Constructor
@public
def __init__(_verifierUtil: address):
  self.verifierUtil = _verifierUtil

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
def decodePaymentChannelState(
  stateBytes: bytes[256]
) -> (uint256, uint256, address, address):
  assert self == extract32(stateBytes, 0, type=address)
  return (
    extract32(stateBytes, 32*1, type=uint256),  # blkNum
    extract32(stateBytes, 32*2, type=uint256),  # segment
    extract32(stateBytes, 32*3, type=address),  # participant
    extract32(stateBytes, 32*4, type=address)   # participant
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
  participant1: address
  participant2: address
  (blkNum, segment, participant1, participant2) = self.decodePaymentChannelState(_stateUpdate)
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
  previousBlkNum: uint256
  exitSegment: uint256
  participant1: address
  participant2: address
  challengeSegment: uint256
  challengeBlkNum: uint256
  (previousBlkNum, exitSegment, participant1, participant2) = self.decodePaymentChannelState(_stateBytes)
  (challengeBlkNum, challengeSegment) = self.decodeState(_nextStateUpdate)
  assert VerifierUtil(self.verifierUtil).isContainSegment(exitSegment, challengeSegment)
  assert VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _transactionWitness, 0) == participant1
  assert VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _transactionWitness, 1) == participant2
  return True
