#
# Payment Channel Uncooporative State
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
def encodeState(
  owner: address,
  segment: uint256,
  blkNum: uint256,
  to: address,
  latestBalance: uint256
) -> (bytes[256]):
  return concat(
    convert(self, bytes32),
    convert(owner, bytes32),
    convert(segment, bytes32),
    convert(blkNum, bytes32),
    convert(to, bytes32),
    convert(latestBalance, bytes32)
  )
