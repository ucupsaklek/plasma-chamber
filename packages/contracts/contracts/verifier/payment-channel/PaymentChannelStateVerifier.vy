#
# Payment Channel State
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

# evidence of escrow
@public
@constant
def encodeSpentEvidence(
  segment: uint256,
  blkNum: uint256,
  sigs: bytes[130]
) -> (bytes[194]):
  return concat(
    convert(segment, bytes32),
    convert(blkNum, bytes32),
    slice(sigs, start=0, len=65), #senderSig
    slice(sigs, start=65, len=65)  #recepientSig
  )

@public
@constant
def decodeSpentEvidence(
  witnessBytes: bytes[129]
) -> (uint256, uint256, bytes[65]):
  # segment, blkNum, senderSig, recepientSig
  return (
    extract32(witnessBytes, 32*0, type=uint256),
    extract32(witnessBytes, 32*1, type=uint256),
    slice(witnessBytes, start=32*2, len=65),
    slice(witnessBytes, start=32*2 + 65, len=65)
  )

# @dev Constructor
@public
def __init__(_verifierUtil: address):
  self.verifierUtil = _verifierUtil

@public
@constant
def decodeState(
  stateBytes: bytes[256]
) -> (address, uint256, uint256, address):
  # owner, segment, blkNum, to
  assert self == extract32(stateBytes, 0, type=address)
  return (
    extract32(stateBytes, 32*1, type=address),
    extract32(stateBytes, 32*2, type=uint256),
    extract32(stateBytes, 32*3, type=uint256),
    extract32(stateBytes, 32*4, type=address)
  )

# close payment channel
@public
@constant
def isSpent(
  _txHash: bytes32,
  _stateBytes: bytes[256],
  _evidence: bytes[129],
  _timestamp: uint256
) -> (bool):
  # owner, segment, blkNum, to
  exitOwner: address
  exitSegment: uint256
  exitBlkNum: uint256
  exitTo: address
  challengeSegment: uint256
  challengeBlkNum: uint256
  senderSig: bytes[65]
  recepientSig: bytes[65]
  (exitOwner, exitSegment, exitBlkNum, exitTo) = self.decodeState(_stateBytes)
  (challengeSegment, challengeBlkNum, senderSig, recepientSig) = self.decodeSpentEvidence(_evidence)
  assert VerifierUtil(self.verifierUtil).isContainSegment(exitSegment, challengeSegment)
  expectedSender: address = VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, senderSig, 0)
  expectedRecepient: address = VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, recepientSig, 0)
  if expectedSender == exitOwner and expectedRecepient == exitTo:
    # cooperative close
    return True
  elif expectedSender == exitOwner or expectedRecepient == exitTo:
    # uncooperative close
    return True
  assert challengeBlkNum == exitBlkNum
  return True

# definition of withdrawal
# uncooporative close
@public
@constant
def withdrawal(
  _stateBytes: bytes[256]
) -> (bool):
  # owner, segment, blkNum, to
  exitOwner: address
  exitSegment: uint256
  exitBlkNum: uint256
  exitTo: address
  senderSig: bytes[65]
  recepientSig: bytes[65]
  (exitOwner, exitSegment, exitBlkNum, exitTo) = self.decodeState(_stateBytes)
  # TODO: transfer to payment channel contract
  # sender and recepient can challenge close after withdrawal

@public
@constant
def encodeState(
  owner: address,
  segment: uint256,
  blkNum: uint256,
  to: address
) -> (bytes[256]):
  return concat(
    convert(self, bytes32),
    convert(owner, bytes32),
    convert(segment, bytes32),
    convert(blkNum, bytes32),
    convert(to, bytes32)
  )
