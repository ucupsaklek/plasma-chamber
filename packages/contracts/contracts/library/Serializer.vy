INCLUSION_WITNESS_START: constant(int128) = 46
INCLUSION_PROOF_START: constant(int128) = 36

@public
def decodeInclusionProofHeader(
  _proofs: bytes[2352],
  _index: int128,
  _numNodes: int128
) -> (
  uint256,    # currentAmount
  uint256    # totalAmount
):
  size: int128 = 46 + _numNodes * 41
  currentAmount: uint256 = convert(slice(_proofs, start=INCLUSION_WITNESS_START + INCLUSION_PROOF_START + size * _index, len=8), uint256)
  totalAmount: uint256 = convert(slice(_proofs, start=INCLUSION_WITNESS_START + INCLUSION_PROOF_START + 8 + size * _index, len=2), uint256)
  return (
    currentAmount,
    totalAmount
  )

@public
def decodeInclusionProof(
  _proofs: bytes[2352],
  _index: int128,
  _i: int128,
  _numNodes: int128
) -> (
  uint256,    # leftOrRight
  uint256,    # amount
  bytes32     # proofElement
):
  size: int128 = 46 + _numNodes * 41
  leftOrRight: uint256 = convert(slice(_proofs, start=INCLUSION_WITNESS_START + 46 +  size * _index + _i * 41, len=1), uint256)
  amount: uint256 = convert(slice(_proofs, start=INCLUSION_WITNESS_START + 46 +  size * _index + _i * 41 + 1, len=8), uint256)
  proofElement: bytes32 = extract32(_proofs, INCLUSION_WITNESS_START + 46 +  size * _index + _i * 41 + 9, type=bytes32)
  return (
    leftOrRight,
    amount,
    proofElement
  )


@public
def decodeHeaderOfInclusionWitness(
  _proofs: bytes[2352]
) -> (
  int128,     # numTx
  int128,     # txIndex
  bytes32,    # root
  uint256,    # blockTimestamp
  int128      # numNodes
):
  numTx: int128 = convert(slice(_proofs, start=0, len=2), int128)
  txIndex: int128 = convert(slice(_proofs, start=2, len=2), int128)
  root: bytes32 = extract32(_proofs, 4, type=bytes32)
  blockTimestamp: uint256 = convert(slice(_proofs, start=36, len=8), uint256)
  numNodes: int128 = convert(slice(_proofs, start=44, len=2), int128)
  return (
    numTx,
    txIndex,
    root,
    blockTimestamp,
    numNodes
  )


@public
def decodeInclusionWitness(
  _proofs: bytes[2352],
  _index: int128,
  _numNodes: int128
) -> (
  int128,     # txBytesOffset
  int128,     # txBytesSize
  uint256    # segment
):
  size: int128 = 46 + _numNodes * 41
  txBytesOffset: int128 = convert(slice(_proofs, start=INCLUSION_WITNESS_START + size * _index, len=2), int128)
  txBytesSize: int128 = convert(slice(_proofs, start=INCLUSION_WITNESS_START + 2 + size * _index, len=2), int128)
  segment: uint256 = extract32(_proofs, INCLUSION_WITNESS_START + 4 + size * _index, type=uint256)
  return (
    txBytesOffset,
    txBytesSize,
    segment
  )
