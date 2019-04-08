struct tokenListing:
  # amount is plasma amount * decimalOffset
  decimalOffset:  uint256
  # address of the ERC20, ETH is ZERO_ADDRESS
  tokenAddress: address

struct Exit:
  owner: address
  exitableAt: uint256
  txHash: bytes32
  stateHash: bytes32
  blkNum: uint256
  segment: uint256
  isFinalized: bool

# extended attributes of exit
struct ExtendExit:
  extendedExitableAt: uint256
  priority: uint256
  challengeCount: uint256

struct Challenge:
  segment: uint256
  blkNum: uint256
  isAvailable: bool
  exitId: uint256

# This construction is from Plasma Group's imeplementation
# https://github.com/plasma-group/plasma-contracts/blob/master/contracts/PlasmaChain.vy#L6
struct exitableRange:
  start: uint256
  isAvailable: bool

contract ERC20:
  def transferFrom(_from: address, _to: address, _value: uint256) -> bool: modifying
  def transfer(to: address, tokens: uint256) -> bool: modifying
  def approve(spender: address, tokens: uint256) -> bool: modifying

contract ERC721:
  def setup(): modifying
  def mint(_to: address, _tokenId: uint256): modifying
  def ownerOf(_tokenId: uint256) -> address: constant
  def burn(_tokenId: uint256): modifying

contract Checkpoint():
  def getCheckpoint(
    _checkpointId: uint256
  ) -> (uint256, uint256): constant

contract VerifierUtil():
  def parseSegment(
    segment: uint256
  ) -> (uint256, uint256, uint256): constant
  def isContainSegment(
    segment: uint256,
    small: uint256
  ) -> (bool): constant
  def hasInterSection(
    segment1: uint256,
    segment2: uint256
  ) -> (uint256, uint256, uint256): constant

contract Serializer():
  def decodeInclusionWitness(
    _proofs: bytes[2352],
    _index: int128,
    _numNodes: int128
  ) -> (int128, int128, uint256, bytes[65]): constant
  def decodeHeaderOfInclusionWitness(
    _proofs: bytes[2352]
  ) -> (int128, int128, bytes32, uint256, int128): constant
  def decodeInclusionProofHeader(
    _proofs: bytes[2352],
    _index: int128,
    _numNodes: int128
  ) -> (uint256, uint256): constant
  def decodeInclusionProof(
    _proofs: bytes[2352],
    _index: int128,
    _i: int128,
    _numNodes: int128
  ) -> (uint256, uint256, bytes32): constant

contract CustomVerifier():
  def canInitiateExit(
    _txHash: bytes32,
    _stateUpdate: bytes[256],
    _owner: address,
    _segment: uint256
  ) -> bool: constant
  def verifyDeprecation(
    _txHash: bytes32,
    _stateBytes: bytes[256],
    _nextStateUpdate: bytes[256],
    _transactionWitness: bytes[130],
    _timestamp: uint256
  ) -> bool: constant
  def verifyDeposit(
    _requestingSegment: uint256,
    _owner: address,
    _txBytes: bytes[256],
    _hash: bytes32,
    _txBlkNum: uint256
  ) -> bool: constant

contract PredicateInterface():
  def finalizeExit(
    _exitStateBytes: bytes[256],
    _tokenAddress: address,
    _amount: uint256
  ): modifying

ListingEvent: event({_tokenId: uint256, _tokenAddress: address})
BlockSubmitted: event({_superRoot: bytes32, _root: bytes32, _timestamp: timestamp, _blkNum: uint256})
Deposited: event({_depositer: indexed(address), _tokenId: uint256, _start: uint256, _end: uint256, _blkNum: uint256})
ExitStarted: event({_exitor: indexed(address), _exitId: uint256, _exitStateHash: bytes32, _exitableAt: uint256, _segment: uint256, _blkNum: uint256})
Challenged: event({_exitId: uint256})
ForceIncluded: event({_exitId: uint256})
FinalizedExit: event({_exitId: uint256, _tokenId: uint256, _start: uint256, _end: uint256})
ExitableMerged: event({_tokenId: uint256, _start: uint256, _end: uint256})

# management
operator: address
verifierUtil:address
serializer:address
txverifier: address
checkpointAddress: address
childChain: map(uint256, bytes32)
exitToken: address
currentChildBlock: uint256
totalDeposited: public(map(uint256, uint256))
lastPublished: public(uint256)

# token types

listings: public(map(uint256, tokenListing))
listed: public(map(address, uint256))
listingNonce: public(uint256)

# exit

exitNonce: public(uint256)
# tokentype -> ( end -> start
exitable: public(map(uint256, map(uint256, exitableRange)))
exits: map(uint256, Exit)
extendExits: map(uint256, ExtendExit)
challenges: map(bytes32, Challenge)
childs: map(uint256, uint256)
lowerExits: map(uint256, uint256)

# total deposit amount per token type
TOTAL_DEPOSIT: constant(uint256) = 2**48
MASK8BYTES: constant(uint256) = 2**64 - 1

# exit period is 4 weeks
EXIT_PERIOD_SECONDS: constant(uint256) = 4 * 7 * 24 * 60 * 60
# 3 days extended period for withholding attack
EXTEND_PERIOD_SECONDS: constant(uint256) = 3 * 24 * 60 * 60

# bonds
EXIT_BOND: constant(wei_value) = as_wei_value(1, "finney")
CHALLENGE_BOND: constant(wei_value) = as_wei_value(1, "finney")
FORCE_INCLUDE_BOND: constant(wei_value) = as_wei_value(1, "finney")


@private
@constant
def getPlasmaBlockHash(
  _root: bytes32,
  _timestamp: uint256
) -> bytes32:
  return sha3(concat(
    _root,
    convert(_timestamp, bytes32)
  ))

@private
@constant
def checkMembership(
  _start: uint256,
  _end: uint256,
  _leaf: bytes32,
  _rootHash: bytes32,
  _proof: bytes[2352],
  _index: int128,
  _numNodes: int128
) -> bool:
  currentAmount: uint256
  totalAmount: uint256
  (currentAmount, totalAmount) = Serializer(self.serializer).decodeInclusionProofHeader(_proof, _index, _numNodes)
  currentLeft: uint256 = 0
  currentRight: uint256 = TOTAL_DEPOSIT * totalAmount
  computedHash: bytes32 = _leaf
  proofElement: bytes32
  for i in range(16):
    if i >= _numNodes:
      break
    leftOrRight: uint256
    amount: uint256
    (leftOrRight, amount, proofElement) = Serializer(self.serializer).decodeInclusionProof(_proof, _index, i, _numNodes)
    if leftOrRight == 0:
      currentRight -= amount
      computedHash = sha3(concat(
        convert(currentAmount, bytes32), computedHash, convert(amount, bytes32), proofElement))
    else:
      currentLeft += amount
      computedHash = sha3(concat(
        convert(amount, bytes32), proofElement, convert(currentAmount, bytes32), computedHash))
    currentAmount += amount
  return (computedHash == _rootHash) and (currentLeft <= _start) and (_end <= currentRight)

# check transaction include deposit transaction
@public
@constant
def checkTransaction(
  _requestingSegment: uint256,
  _txHash: bytes32,
  _txBytes: bytes[256],
  _blkNum: uint256,
  _proofs: bytes[2352],
  _outputIndex: uint256,
  _owner: address
) -> bytes[256]:
  root: bytes32
  blockTimestamp: uint256
  requestingTxBytes: bytes[256]
  if _blkNum % 2 == 0:
    numTx: int128
    txIndex: int128
    numNodes: int128
    (numTx, txIndex, root, blockTimestamp, numNodes) = Serializer(self.serializer).decodeHeaderOfInclusionWitness(_proofs)
    assert self.childChain[_blkNum] == self.getPlasmaBlockHash(root, blockTimestamp)
    for i in range(4):
      if i >= numTx:
        break
      tokenId: uint256
      start: uint256
      end: uint256
      txBytesOffset: int128
      txBytesSize: int128
      segment: uint256
      sig: bytes[65]
      (txBytesOffset, txBytesSize, segment, sig) = Serializer(self.serializer).decodeInclusionWitness(_proofs, i, numNodes)
      slicedTxBytes: bytes[256] = slice(_txBytes, start=txBytesOffset, len=txBytesSize)
      (tokenId, start, end) = VerifierUtil(self.verifierUtil).parseSegment(segment)
      assert self.checkMembership(
        start + tokenId * TOTAL_DEPOSIT,
        end + tokenId * TOTAL_DEPOSIT,
        _txHash,
        root,
        _proofs,
        i,
        numNodes
      )
      if txIndex == i:
        assert CustomVerifier(self.txverifier).canInitiateExit(
          _txHash,
          slicedTxBytes,
          _owner,
          segment)
        assert _requestingSegment == segment
        requestingTxBytes = slicedTxBytes
      else:
        assert CustomVerifier(self.txverifier).canInitiateExit(
          _txHash,
          slicedTxBytes,
          ZERO_ADDRESS,
          segment)
    return requestingTxBytes
  else:
    # deposit transaction
    assert CustomVerifier(self.txverifier).verifyDeposit(
      _requestingSegment,
      _owner,
      _txBytes,
      self.childChain[_blkNum],
      _blkNum)
    return _txBytes

# checkExitable construction is from Plasma Group
# https://github.com/plasma-group/plasma-contracts/blob/master/contracts/PlasmaChain.vy#L363
@private
@constant
def checkExitable(
  _tokenId: uint256,
  _start: uint256,
  _end: uint256,
  _exitableEnd: uint256
):
  assert _end <= TOTAL_DEPOSIT
  assert _end <= _exitableEnd
  assert _start >= self.exitable[_tokenId][_exitableEnd].start
  assert self.exitable[_tokenId][_exitableEnd].isAvailable

@private
def removeExitable(
  _tokenId: uint256,
  _newStart: uint256,
  _newEnd: uint256,
  _oldEnd: uint256
):
  oldStart: uint256 = self.exitable[_tokenId][_oldEnd].start
  # old start < new start
  if _newStart > oldStart:
    self.exitable[_tokenId][_newStart].start = oldStart
    self.exitable[_tokenId][_newStart].isAvailable = True
  # new end < old end
  if _newEnd < _oldEnd:
    self.exitable[_tokenId][_oldEnd].start = _newEnd
    self.exitable[_tokenId][_oldEnd].isAvailable = True
    self.exitable[_tokenId][_newEnd].start = _newStart
    self.exitable[_tokenId][_newEnd].isAvailable = False
  # new end >= old start
  else:
    # _newEnd is right most
    if _newEnd != self.totalDeposited[_tokenId]:
      self.exitable[_tokenId][_newEnd].isAvailable = False
    # _newEnd isn't right most
    else:
      self.exitable[_tokenId][_newEnd].start = _newEnd 

# @dev processDeposit
@private
def processDeposit(
  depositer: address,
  tokenId: uint256,
  amount: uint256
):
  self.currentChildBlock += (1 + (self.currentChildBlock % 2))
  start: uint256 = self.totalDeposited[tokenId]
  self.totalDeposited[tokenId] += amount
  end: uint256 = self.totalDeposited[tokenId]
  root: bytes32 = sha3(
                    concat(
                      convert(depositer, bytes32),
                      convert(tokenId, bytes32),
                      convert(start, bytes32),
                      convert(end, bytes32)
                    )
                  )
  oldStart: uint256 = self.exitable[tokenId][start].start
  clear(self.exitable[tokenId][start])
  self.exitable[tokenId][end].start = oldStart
  self.exitable[tokenId][end].isAvailable = True
  self.childChain[self.currentChildBlock] = root
  log.Deposited(depositer, tokenId, start, end, self.currentChildBlock)

# @dev processDepositFragment
@private
def processDepositFragment(
  depositer: address,
  tokenId: uint256,
  start: uint256,
  end: uint256,
  exitableEnd: uint256
):
  self.currentChildBlock += (1 + (self.currentChildBlock % 2))
  assert self.exitable[tokenId][exitableEnd].start == start
  assert self.exitable[tokenId][exitableEnd].isAvailable == False
  self.exitable[tokenId][exitableEnd].start = end
  self.exitable[tokenId][end].start = start
  self.exitable[tokenId][end].isAvailable = True
  root: bytes32 = sha3(
                    concat(
                      convert(depositer, bytes32),
                      convert(tokenId, bytes32),
                      convert(start, bytes32),
                      convert(end, bytes32)
                    )
                  )
  self.childChain[self.currentChildBlock] = root
  log.Deposited(depositer, tokenId, start, end, self.currentChildBlock)

@public
@constant
def decodePredicate(_state: bytes[256]) -> (address):
  return extract32(_state, 0, type=address)

# @dev Constructor
@public
def __init__(
  _verifierUtil: address,
  _serializer: address,
  _txverifierAddress: address,
  _exitToken: address,
  _checkpointAddress: address
):
  self.operator = msg.sender
  self.currentChildBlock = 1
  self.verifierUtil = _verifierUtil
  self.serializer = _serializer
  self.txverifier = _txverifierAddress
  self.exitToken = create_with_code_of(_exitToken)
  self.checkpointAddress = _checkpointAddress
  ERC721(self.exitToken).setup()
  self.listingNonce = 0
  self.exitNonce = 1

@public
@constant
def getTokenAddress() -> address:
  return self.exitToken

@public
def listToken(
  tokenAddress: address,
  denomination: uint256
):
  tokenId: uint256 = self.listingNonce
  self.listings[tokenId].decimalOffset = denomination
  self.listings[tokenId].tokenAddress = tokenAddress
  self.listed[tokenAddress] = tokenId
  self.listingNonce += 1
  # init the new token exitable ranges
  self.exitable[tokenId][0].isAvailable = True
  log.ListingEvent(tokenId, tokenAddress)

@public
@constant
def getTokenFromId(
  tokenId: uint256
) -> (address, uint256):
  return (self.listings[tokenId].tokenAddress, self.listings[tokenId].decimalOffset)

@public
def setup():
  self.listToken(ZERO_ADDRESS, as_unitless_number(as_wei_value(1, "gwei")))

@public
def updateOperator(_newOperator: address):
  assert msg.sender == self.operator
  self.operator = _newOperator

# @dev submit plasma block
@public
def submit(_root: bytes32):
  assert msg.sender == self.operator
  self.currentChildBlock += (2 - (self.currentChildBlock % 2))
  _superRoot: bytes32 = self.getPlasmaBlockHash(_root, as_unitless_number(block.timestamp))
  self.childChain[self.currentChildBlock] = _superRoot
  log.BlockSubmitted(_superRoot, _root, block.timestamp, self.currentChildBlock)

# @dev deposit
@public
@payable
def deposit():
  # 1 in Plasma is 1 gwei
  decimalOffset: wei_value = as_wei_value(1, "gwei")
  assert (msg.value % decimalOffset == 0)
  self.processDeposit(
    msg.sender,
    0,
    as_unitless_number(msg.value / decimalOffset))

# @dev depositFragment
@public
@payable
def depositFragment(
  start: uint256,
  end: uint256,
  exitableEnd: uint256
):
  decimalOffset: wei_value = as_wei_value(1, "gwei")
  assert (msg.value % decimalOffset == 0)
  assert start + as_unitless_number(msg.value / decimalOffset) == end
  self.processDepositFragment(
    msg.sender,
    0,
    start,
    end,
    exitableEnd)

@public
def depositERC20(
  token: address,
  amount: uint256
):
  depositer: address = msg.sender
  passed: bool = ERC20(token).transferFrom(depositer, self, amount)
  tokenId: uint256 = self.listed[token]
  assert passed
  self.processDeposit(
    depositer,
    tokenId,
    amount / self.listings[tokenId].decimalOffset)

# @dev exit
@public
@payable
def exit(
  _utxoPos: uint256,
  _segment: uint256,
  _txBytes: bytes[256],
  _proof: bytes[2352]
):
  assert msg.value == EXIT_BOND
  exitableAt: uint256 = as_unitless_number(block.timestamp) + EXIT_PERIOD_SECONDS
  blkNum: uint256 = _utxoPos / 100
  outputIndex: uint256 = _utxoPos - blkNum * 100
  txHash: bytes32 = sha3(_txBytes)
  exitId: uint256 = self.exitNonce
  if self.challenges[txHash].isAvailable and self.challenges[txHash].blkNum < blkNum:
    # prevTx's segment should contains exit segment
    # https://github.com/cryptoeconomicslab/chamber-packages/pull/184
    assert VerifierUtil(self.verifierUtil).isContainSegment(self.challenges[txHash].segment, _segment)
    self.extendExits[exitId].priority = self.challenges[txHash].blkNum
    self.childs[self.challenges[txHash].exitId] = exitId
  stateHash: bytes32 = sha3(self.checkTransaction(
    _segment,
    txHash,
    _txBytes,
    blkNum,
    _proof,
    outputIndex,
    msg.sender
  ))
  self.exitNonce += 1
  self.exits[exitId] = Exit({
    owner: msg.sender,
    exitableAt: exitableAt,
    txHash: txHash,
    stateHash: stateHash,
    blkNum: blkNum,
    segment: _segment,
    isFinalized: False
  })
  ERC721(self.exitToken).mint(msg.sender, exitId)
  log.ExitStarted(msg.sender, exitId, stateHash, exitableAt, _segment, blkNum)

# @dev challenge
# @param _utxoPos is blknum and index of challenge tx
@public
def challenge(
  _exitId: uint256,
  _childExitId: uint256,
  _exitStateBytes: bytes[256],
  _utxoPos: uint256,
  _segment: uint256,
  _txBytes: bytes[256],
  _proof: bytes[2352],
  _deprecationWitness: bytes[130]
):
  blkNum: uint256 = _utxoPos / 100
  txoIndex: uint256 = _utxoPos - blkNum * 100
  exit: Exit = self.exits[_exitId]
  exitBlkNum: uint256 = exit.blkNum
  VerifierUtil(self.verifierUtil).hasInterSection(_segment, exit.segment)
  txHash: bytes32 = sha3(_txBytes)
  assert exit.stateHash == sha3(_exitStateBytes)
  if _exitId == _childExitId:
    # spent challenge
    assert exitBlkNum < blkNum
  else:
    # double spent challenge
    assert self.childs[_exitId] == _childExitId
    assert exitBlkNum < blkNum and blkNum < self.exits[_childExitId].blkNum
  assert exit.exitableAt > as_unitless_number(block.timestamp)
  stateBytes: bytes[256] = self.checkTransaction(
    _segment,
    txHash,
    _txBytes,
    blkNum,
    _proof,
    0,
    ZERO_ADDRESS
  )
  if _exitId == _childExitId:
    lowerExit: uint256 = self.lowerExits[_exitId]
    if self.exits[lowerExit].owner != ZERO_ADDRESS:
      self.extendExits[lowerExit].challengeCount -= 1
      if as_unitless_number(block.timestamp) > self.exits[lowerExit].exitableAt - EXTEND_PERIOD_SECONDS:
        self.extendExits[lowerExit].extendedExitableAt = as_unitless_number(block.timestamp) + EXTEND_PERIOD_SECONDS
    self.challenges[txHash] = Challenge({
      segment: exit.segment,
      blkNum: exitBlkNum,
      isAvailable: True,
      exitId: _exitId
    })
  blockTimestamp: uint256 = convert(slice(_proof, start=32, len=8), uint256)
  assert CustomVerifier(self.txverifier).verifyDeprecation(
    txHash,
    _exitStateBytes,
    stateBytes,
    _deprecationWitness,
    blockTimestamp)
  # break exit procedure
  if _exitId == _childExitId:
    self.exits[_exitId].owner = ZERO_ADDRESS
    clear(self.exits[_exitId])
  else:
    self.exits[_childExitId].owner = ZERO_ADDRESS
    clear(self.exits[_childExitId])
  send(msg.sender, EXIT_BOND)
  log.Challenged(_exitId)

# @dev requestHigherPriorityExit
#     This is an alternative to invalid history challenge.
@public
def requestHigherPriorityExit(
  _higherPriorityExitId: uint256,
  _lowerPriorityExitId: uint256
):
  higherPriorityExit: Exit = self.exits[_higherPriorityExitId]
  exit: Exit = self.exits[_lowerPriorityExitId]
  higherPriority: uint256 = higherPriorityExit.blkNum
  lowerPriority: uint256 = exit.blkNum
  if self.extendExits[_higherPriorityExitId].priority > 0:
    higherPriority = self.extendExits[_higherPriorityExitId].priority
  if self.extendExits[_lowerPriorityExitId].priority > 0:
    lowerPriority = self.extendExits[_lowerPriorityExitId].priority
  assert higherPriority < lowerPriority
  assert self.lowerExits[_higherPriorityExitId] == 0
  VerifierUtil(self.verifierUtil).hasInterSection(higherPriorityExit.segment, exit.segment)
  self.extendExits[_lowerPriorityExitId].challengeCount += 1
  self.lowerExits[_higherPriorityExitId] = _lowerPriorityExitId

# @dev finalizeExit
@public
def finalizeExit(
  _exitableEnd: uint256,
  _exitId: uint256,
  _exitStateBytes: bytes[256]
):
  assert ERC721(self.exitToken).ownerOf(_exitId) == msg.sender
  exit: Exit = self.exits[_exitId]
  tokenId: uint256
  start: uint256
  end: uint256
  (tokenId, start, end) = VerifierUtil(self.verifierUtil).parseSegment(exit.segment)
  # check _tokenId is correct
  self.checkExitable(
    tokenId,
    start,
    end,
    _exitableEnd,
  )
  self.removeExitable(
    tokenId,
    start,
    end,
    _exitableEnd
  )
  assert exit.exitableAt < as_unitless_number(block.timestamp) and self.extendExits[_exitId].extendedExitableAt < as_unitless_number(block.timestamp)
  assert self.extendExits[_exitId].challengeCount == 0
  assert exit.stateHash == sha3(_exitStateBytes)
  predicate: address = self.decodePredicate(_exitStateBytes)
  withdrawer: address
  tokenAddress: address = ZERO_ADDRESS
  amount: uint256
  if predicate == ZERO_ADDRESS:
    withdrawer = exit.owner
  else:
    withdrawer = predicate
  if tokenId == 0:
    amount = (end - start) * (10 ** 9)
    send(withdrawer, as_wei_value(amount, "wei"))
  else:
    tokenAddress = self.listings[tokenId].tokenAddress
    amount = (end - start) * self.listings[tokenId].decimalOffset
    ERC20(tokenAddress).transfer(withdrawer, amount)
    pass
  if predicate != ZERO_ADDRESS:
    PredicateInterface(predicate).finalizeExit(_exitStateBytes, tokenAddress, amount)
  else:
    pass
  send(exit.owner, EXIT_BOND)
  self.exits[_exitId].isFinalized = True
  ERC721(self.exitToken).burn(_exitId)
  log.FinalizedExit(_exitId, tokenId, start, end)

@public
def challengeTooOldExit(
  _checkpointId: uint256,
  _utxoPos: uint256,
  _exitId: uint256,
  _segment: uint256,
  _txBytes: bytes[256],
  _proof: bytes[2352]
):
  blkNum: uint256 = _utxoPos / 100
  outputIndex: uint256 = _utxoPos - blkNum * 100
  exit: Exit = self.exits[_exitId]
  VerifierUtil(self.verifierUtil).hasInterSection(_segment, exit.segment)
  checkpointBlkNum: uint256
  checkpointSegment: uint256
  (checkpointBlkNum, checkpointSegment) = Checkpoint(self.checkpointAddress).getCheckpoint(_checkpointId)
  VerifierUtil(self.verifierUtil).hasInterSection(_segment, checkpointSegment)
  txHash: bytes32 = sha3(_txBytes)
  assert blkNum <= checkpointBlkNum
  priority: uint256 = exit.blkNum
  if self.extendExits[_exitId].priority > 0:
    priority = self.extendExits[_exitId].priority
  assert blkNum > priority
  self.checkTransaction(
    _segment,
    txHash,
    _txBytes,
    blkNum,
    _proof,
    outputIndex,
    ZERO_ADDRESS
  )
  # break exit
  clear(self.exits[_exitId])
  log.Challenged(_exitId)

# @dev mergeExitable
@public
def mergeExitable(
  _segment1: uint256,
  _segment2: uint256
):
  tokenId1: uint256
  start1: uint256
  end1: uint256
  tokenId2: uint256
  start2: uint256
  end2: uint256
  (tokenId1, start1, end1) = VerifierUtil(self.verifierUtil).parseSegment(_segment1)
  (tokenId2, start2, end2) = VerifierUtil(self.verifierUtil).parseSegment(_segment2)
  assert tokenId1 == tokenId2 and end1 == start2
  assert self.exitable[tokenId1][end1].start == start1
  assert self.exitable[tokenId1][end2].start == start2
  assert self.exitable[tokenId1][end1].isAvailable == self.exitable[tokenId1][end2].isAvailable
  self.exitable[tokenId1][end2].start = start1
  clear(self.exitable[tokenId1][end1])
  log.ExitableMerged(tokenId1, start1, end2)

# @dev getExit
@public
@constant
def getExit(
  _exitId: uint256
) -> (address, uint256, uint256):
  exit: Exit = self.exits[_exitId]
  return (exit.owner, exit.exitableAt, self.extendExits[_exitId].challengeCount)

# @dev getExit
@public
@constant
def getFinalizedExit(
  _exitId: uint256
) -> (address, uint256, uint256):
  exit: Exit = self.exits[_exitId]
  assert exit.isFinalized
  return (exit.owner, exit.blkNum, exit.segment)

# @dev getPlasmaBlock
@public
@constant
def getPlasmaBlock(
  _blkNum: uint256
) -> (bytes32):
  return self.childChain[_blkNum]
