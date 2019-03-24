# escrow

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
  ) -> (uint256):constant
  def isContainSegment(
    segment: uint256,
    small: uint256
  ) -> (bool): constant

contract OwnStateVerifier():
  def encodeSpentEvidence(
    segment: uint256,
    blkNum: uint256,
    sigs: bytes[65]
  ) -> (bytes[256]): constant
  def encodeState(
    owner: address,
    segment: uint256,
    blkNum: uint256
  ) -> (bytes[256]): constant
  def decodeState(
    stateBytes: bytes[256]
  ) -> (address, uint256, uint256, uint256): constant

contract PaymentChannelStateVerifier():
  def encodeSpentEvidence(
    segment: uint256,
    blkNum: uint256,
    sigs: bytes[65]
  ) -> (bytes[256]): constant
  def encodeState(
    owner: address,
    segment: uint256,
    blkNum: uint256,
    to: address
  ) -> (bytes[256]): constant
  def decodeState(
    stateBytes: bytes[256]
  ) -> (address, uint256, uint256, address): constant

contract PaymentChannelUncooporativeStateVerifier():
  def encodeState(
    owner: address,
    segment: uint256,
    blkNum: uint256,
    to: address,
    latestBalance: uint256
  ) -> (bytes[256]): constant

verifierUtil: public(address)
ownStateVerifier: public(address)
paymentChannelStateVerifier: public(address)
paymentChannelUncooporativeStateVerifier: public(address)

@private
@constant
def decodePaymentChannel(
  _txBytes: bytes[496],
) -> (address, uint256, uint256, address):
  # _from, segment, blkNum, ttp, latestBalance
  return (
    extract32(_txBytes, 0 + 16, type=address),
    extract32(_txBytes, 32 + 16, type=uint256),
    extract32(_txBytes, 64 + 16, type=uint256),
    extract32(_txBytes, 96 + 16, type=address),
    extract32(_txBytes, 128 + 16, type=uint256))

# @dev Constructor
@public
def __init__(
  _verifierUtil: address,
  _ownStateVerifier: address,
  _paymentChannelStateVerifier: address,
  _paymentChannelUncooporativeStateVerifier: address
):
  self.verifierUtil = _verifierUtil
  self.ownStateVerifier = _ownStateVerifier
  self.paymentChannelStateVerifier = _paymentChannelStateVerifier
  self.paymentChannelUncooporativeStateVerifier = _paymentChannelUncooporativeStateVerifier

@public
@constant
def isExitGamable(
  _label: uint256,
  _txHash: bytes32,
  _merkleHash: bytes32,
  _txBytes: bytes[496],
  _sigs: bytes[260],
  _outputIndex: uint256,
  _owner: address,
  _segment: uint256
) -> (bool):
  _from: address
  segment: uint256
  blkNum: uint256
  to: address
  latestBalance: uint256
  (_from, segment, blkNum, latestBalance) = self.decodePaymentChannel(_txBytes)
  if _owner != ZERO_ADDRESS:
    assert(_owner == _from or _owner == to)
  assert VerifierUtil(self.verifierUtil).isContainSegment(segment, _segment)
  if _label == 1:   # open channel
    assert (VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _sigs, 0) == _from)
    return True
  elif _label == 2: # cooperative close
    assert (VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _sigs, 0) == _from)
    assert (VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _sigs, 1) == to)
    return True
  elif _label == 3: # uncooperative close
    assert (VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _sigs, 0) == _from) or (VerifierUtil(self.verifierUtil).ecrecoverSig(_txHash, _sigs, 0) == to)
    return True
  return False

@public
@constant
def getOutput(
  _label: uint256,
  _txBytes: bytes[496],
  _txBlkNum: uint256,
  _index: uint256
) -> (bytes[256]):
  _from: address
  segment: uint256
  blkNum: uint256
  to: address
  latestBalance: uint256
  (_from, segment, blkNum, to, latestBalance) = self.decodePaymentChannel(_txBytes)
  if _label == 1:   # open channel
    return PaymentChannelStateVerifier(self.paymentChannelStateVerifier).encodeState(
      _from, segment, _txBlkNum, to)
  elif _label == 2: # cooperative close
    tokenId: uint256
    start: uint256
    end: uint256
    (tokenId, start, end) = VerifierUtil(self.verifierUtil).parseSegment(segment)
    if _index == 0:
      return OwnStateVerifier(self.ownStateVerifier).encodeState(_from, VerifierUtil(self.verifierUtil).encodeSegment(tokenId, start, start + latestBalance), _txBlkNum)
    elif _index == 1:
      return OwnStateVerifier(self.ownStateVerifier).encodeState(to, VerifierUtil(self.verifierUtil).encodeSegment(tokenId, start + latestBalance, end), _txBlkNum)
  elif _label == 3: # uncooperative close
    return PaymentChannelUncooporativeStateVerifier(self.paymentChannelUncooporativeStateVerifier).encodeState(
      _from, segment, _txBlkNum, to, latestBalance)

@public
@constant
def getSpentEvidence(
  _label: uint256,
  _txBytes: bytes[496],
  _index: uint256,
  _sigs: bytes[130]
) -> (bytes[256]):
  _from: address
  segment: uint256
  blkNum: uint256
  to: address
  (_from, segment, blkNum, to) = self.decodePaymentChannel(_txBytes)
  if _label == 1: # open channel
    return OwnStateVerifier(self.ownStateVerifier).encodeSpentEvidence(
      segment,
      blkNum,
      slice(_sigs, start=0, len=65)
    )
  else:
    return PaymentChannelStateVerifier(self.escrowStateVerifier).encodeSpentEvidence(
      segment,
      blkNum,
      _sigs
    )

