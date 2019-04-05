contract VerifierUtil():
  def ecrecoverSig(
    _txHash: bytes32,
    _sig: bytes[260],
    index: int128
  ) -> address: constant
  def parseSegment(
    segment: uint256
  ) -> (uint256, uint256, uint256): constant
  def encodeSegment(
    tokenId: uint256,
    start: uint256,
    end: uint256
  ) -> (bytes[96]):constant
  def isContainSegment(
    segment: uint256,
    small: uint256
  ) -> (bool): constant

contract PredicateInterface():
  def canInitiateExit(
    _txHash: bytes32,
    _stateUpdate: bytes[256],
    _owner: address,
    _segment: uint256
  ) -> (bool): constant
  def verifyDeprecation(
    _txHash: bytes32,
    _stateBytes: bytes[256],
    _nextStateUpdate: bytes[256],
    _transactionWitness: bytes[130],
    _timestamp: uint256
  ) -> (bool): constant

PredicateRegistered: event({verifierId: uint256, verifierAddress: address})

verifierUtil: public(address)
ownershipPredicate: public(address)

operator: address

verifiers: map(uint256, address)
verifierNonce: uint256


@public
@constant
def decodePredicate(_state: bytes[256]) -> (address):
  return extract32(_state, 0, type=address)

# @dev decode deposit tx
@public
@constant
def decodeDeposit(
  _txBytes: bytes[256],
) -> (uint256, uint256, address):
  return (
    extract32(_txBytes, 32 * 1, type=uint256),
    extract32(_txBytes, 32 * 2, type=uint256),
    extract32(_txBytes, 32 * 3, type=address))

@public
@constant
def verifyDeposit(
  _requestingSegment: uint256,
  _owner: address,
  _stateUpdate: bytes[256],
  _hash: bytes32,
  _txBlkNum: uint256
) -> bool:
  depositor: address
  blkNum: uint256
  segment: uint256
  token: uint256
  start: uint256
  end: uint256
  (blkNum, segment, depositor) = self.decodeDeposit(_stateUpdate)
  (token, start, end) = VerifierUtil(self.verifierUtil).parseSegment(segment)
  assert(_hash == sha3(
          concat(
            convert(depositor, bytes32),
            convert(token, bytes32),
            convert(start, bytes32),
            convert(end, bytes32)
          )
        ))
  assert(_owner == depositor)
  assert VerifierUtil(self.verifierUtil).isContainSegment(segment, _requestingSegment)
  return True


# @dev Constructor
@public
def __init__(_verifierUtil: address, _ownershipPredicate: address):
  self.operator = msg.sender
  self.verifierUtil = _verifierUtil
  self.ownershipPredicate = _ownershipPredicate
  self.verifierNonce = 1

@public
def registerPredicate(predicate: address):
  verifierId: uint256 = self.verifierNonce
  self.verifiers[verifierId] = predicate
  self.verifierNonce += 1
  log.PredicateRegistered(verifierId, predicate)

# @dev verify the transaction is signed correctly
@public
@constant
def canInitiateExit(
  _txHash: bytes32,
  _stateUpdate: bytes[256],
  _owner: address,
  _segment: uint256
) -> bool:
  predicate: address = self.decodePredicate(_stateUpdate)
  if predicate == ZERO_ADDRESS:
    predicate = self.ownershipPredicate
  return PredicateInterface(predicate).canInitiateExit(
    _txHash,
    _stateUpdate,
    _owner,
    _segment
  )

# @dev verify state deprecation
@public
@constant
def verifyDeprecation(
  _txHash: bytes32,
  _stateBytes: bytes[256],
  _nextStateUpdate: bytes[256],
  _transactionWitness: bytes[130],
  _timestamp: uint256
) -> (bool):
  predicate: address = self.decodePredicate(_stateBytes)
  if predicate == ZERO_ADDRESS:
    predicate = self.ownershipPredicate
  return PredicateInterface(predicate).verifyDeprecation(
    _txHash,
    _stateBytes,
    _nextStateUpdate,
    _transactionWitness,
    _timestamp)
