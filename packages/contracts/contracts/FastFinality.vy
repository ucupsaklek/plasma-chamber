# Plasma Fast Finality contract
# see https://github.com/cryptoeconomicslab/plasma-chamber/wiki/Plasma-Fast-Finality for more description.

struct Merchant:
  tokenAddress: address
  amount: uint256
  expiredAt: uint256

struct Dispute:
  recipient: address
  withdrawableAt: timestamp
  tokenId: uint256
  amount: uint256
  status: uint256
  stateHash: bytes32

contract ERC20:
  def transferFrom(_from: address, _to: address, _value: uint256) -> bool: modifying
  def transfer(_to: address, _value: uint256) -> bool: modifying

contract ERC721:
  def setup(): modifying
  def mint(_to: address, _tokenId: uint256): modifying
  def ownerOf(_tokenId: uint256) -> address: constant
  def burn(_tokenId: uint256): modifying

contract RootChain():
  def getTokenFromId(
    tokenId: uint256
  ) -> (address, uint256): constant
  def checkTransaction(
    _requestingSegment: uint256,
    _txHash: bytes32,
    _txBytes: bytes[496],
    _blkNum: uint256,
    _proofs: bytes[2352],
    _outputIndex: uint256,
    _owner: address
  ) -> bytes[256]: constant

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

FFTokenMinted: event({_merchantId: uint256, _amount: uint256, _expiredAt: uint256})
FFTokenBurned: event({_merchantId: uint256})

BOND: constant(wei_value) = as_wei_value(1, "finney")
MASK8BYTES: constant(uint256) = 2**64 - 1

STATE_FIRST_DISPUTED: constant(uint256) = 1
STATE_CHALLENGED: constant(uint256) = 2
STATE_SECOND_DISPUTED: constant(uint256) = 3
STATE_FINALIZED: constant(uint256) = 4

ffToken: address

merchants: map(uint256, Merchant)
merchantNonce: uint256

operator: address
disputes: map(bytes32, Dispute)
rootchain: address
txverifier: address

#
# Library
#

# @dev from https://github.com/LayerXcom/plasma-mvp-vyper
@private
@constant
def ecrecoverSig(_txHash: bytes32, _sig: bytes[65]) -> address:
  if len(_sig) != 65:
    return ZERO_ADDRESS
  # ref. https://gist.github.com/axic/5b33912c6f61ae6fd96d6c4a47afde6d
  # The signature format is a compact form of:
  # {bytes32 r}{bytes32 s}{uint8 v}
  r: uint256 = extract32(_sig, 0, type=uint256)
  s: uint256 = extract32(_sig, 32, type=uint256)
  v: int128 = convert(slice(_sig, start=64, len=1), int128)
  # Version of signature should be 27 or 28, but 0 and 1 are also possible versions.
  # geth uses [0, 1] and some clients have followed. This might change, see:
  # https://github.com/ethereum/go-ethereum/issues/2053
  if v < 27:
    v += 27
  if v in [27, 28]:
    return ecrecover(_txHash, convert(v, uint256), r, s)
  return ZERO_ADDRESS

@private
@constant
def parseSegment(
  segment: uint256
) -> (uint256, uint256, uint256):
  tokenId: uint256 = bitwise_and(shift(segment, -16 * 8), MASK8BYTES)
  start: uint256 = bitwise_and(shift(segment, -8 * 8), MASK8BYTES)
  end: uint256 = bitwise_and(segment, MASK8BYTES)
  return (tokenId, start, end)

@private
def processDepositCollateral(
  tokenAddress: address,
  amount: uint256,
  expireSpan: uint256
) -> uint256:
  assert expireSpan > 0 and expireSpan < 50 * 7 * 24 * 60 * 60
  expiredAt: uint256 = as_unitless_number(block.timestamp) + expireSpan
  merchantId: uint256 = self.merchantNonce
  self.merchantNonce += 1
  self.merchants[merchantId] = Merchant({
    tokenAddress: tokenAddress,
    amount: amount,
    expiredAt: expiredAt
  })
  ERC721(self.ffToken).mint(self.operator, merchantId)
  log.FFTokenMinted(merchantId, amount, expiredAt)
  return merchantId

# @dev Constructor
@public
def __init__(
  _rootchain: address,
  _txverifier: address,
  _erc721: address
):
  self.operator = msg.sender
  self.rootchain = _rootchain
  self.txverifier = _txverifier
  self.merchantNonce = 0
  self.ffToken = create_with_code_of(_erc721)
  ERC721(self.ffToken).setup()

@public
def getTokenAddress() -> address:
  return self.ffToken

# @dev depositAndMintToken
#     Operator deposit collateral and mint FF NFT.
@public
@payable
def depositAndMintToken(
  expireSpan: uint256
) -> uint256:
  assert msg.sender == self.operator
  return self.processDepositCollateral(
    ZERO_ADDRESS,
    as_unitless_number(msg.value),
    expireSpan
  )

# @dev depositERC20AndMintToken
#     Operator deposit ERC20 token as collateral and mint FF NFT.
@public
def depositERC20AndMintToken(
  token: address,
  amount: uint256,
  expireSpan: uint256
) -> uint256:
  assert msg.sender == self.operator
  assert ERC20(token).transferFrom(self.operator, self, amount)
  return self.processDepositCollateral(
    token,
    amount,
    expireSpan
  )

# @dev withdrawAndBurnToken
@public
def withdrawAndBurnToken(
  _merchantId: uint256
):
  merchant: Merchant = self.merchants[_merchantId]
  assert merchant.amount > 0
  assert merchant.expiredAt < as_unitless_number(block.timestamp)
  if merchant.tokenAddress == ZERO_ADDRESS:
    send(self.operator, as_wei_value(merchant.amount, 'wei'))
  else:
    ERC20(merchant.tokenAddress).transfer(self.operator, merchant.amount)
    pass
  ERC721(self.ffToken).burn(_merchantId)
  clear(self.merchants[_merchantId])
  log.FFTokenBurned(_merchantId)

# @dev dispute
#     Merchant send "FF tx" with operator's signature
#     Check operator's signature of inflight "FF tx" is valid
@public
@payable
def dispute(
  _exitStateBytes: bytes[256],
  _txBytes: bytes[256],
  _sigs: bytes[130],
  _operatorSigs: bytes[65],
  _segment: uint256
):
  assert msg.value == BOND
  # check operator's signatures
  txHash: bytes32 = sha3(_txBytes)
  assert self.disputes[txHash].status == 0 and self.disputes[txHash].withdrawableAt == 0
  assert self.operator == self.ecrecoverSig(txHash, _operatorSigs)
  tokenId: uint256
  start: uint256
  end: uint256
  (tokenId, start, end) = self.parseSegment(_segment)
  assert CustomVerifier(self.txverifier).canInitiateExit(
    txHash,
    _txBytes,
    msg.sender,
    _segment)
  self.disputes[txHash] = Dispute({
    recipient: msg.sender,
    withdrawableAt: block.timestamp + 1 * 7 * 24 * 60 * 60,
    tokenId: tokenId,
    amount: (end - start),
    status: STATE_FIRST_DISPUTED,
    stateHash: sha3(_exitStateBytes)
  })

# @dev challenge
#     Operator challenge showing inclusion of "FF tx"
@public
def challenge(
  _txBytes: bytes[256],
  _proof: bytes[2352],
  _blkNum: uint256,
  _segment: uint256,
):
  txHash: bytes32 = sha3(_txBytes)
  assert self.disputes[txHash].status == STATE_FIRST_DISPUTED
  RootChain(self.rootchain).checkTransaction(
    _segment,
    txHash,
    _txBytes,
    _blkNum,
    _proof,
    0,
    ZERO_ADDRESS)
  self.disputes[txHash].status = STATE_CHALLENGED

# @dev secondDispute
#     Merchant show double spending of "FF tx"
@public
def secondDispute(
  _stateBytes: bytes[256],
  _disputeTxBytes: bytes[256],
  _txBytes: bytes[256],
  _proof: bytes[2352],
  _sigs: bytes[130],
  _blkNum: uint256,
  _segment: uint256
):
  txHash: bytes32 = sha3(_txBytes)
  RootChain(self.rootchain).checkTransaction(
    _segment,
    txHash,
    _txBytes,
    _blkNum,
    _proof,
    0,
    ZERO_ADDRESS)
  disputeId: bytes32 = sha3(_disputeTxBytes)
  assert self.disputes[disputeId].stateHash == sha3(_stateBytes)
  assert CustomVerifier(self.txverifier).verifyDeprecation(
    txHash,
    _stateBytes,
    _txBytes,
    _sigs,
    0
  )
  self.disputes[disputeId].status = STATE_SECOND_DISPUTED

# @dev finalizeDispute
#     Withdraw the amount of "FF tx" from operator's collateral
@public
def finalizeDispute(
  _merchantId: uint256,
  _txHash: bytes32
):
  # finalize dispute after a period
  dispute: Dispute = self.disputes[_txHash]
  assert dispute.withdrawableAt < block.timestamp
  assert dispute.status == STATE_FIRST_DISPUTED or dispute.status == STATE_SECOND_DISPUTED
  assert ERC721(self.ffToken).ownerOf(_merchantId) == msg.sender
  amount: uint256
  tokenAddress: address
  decimalOffset: uint256
  (tokenAddress, decimalOffset) = RootChain(self.rootchain).getTokenFromId(dispute.tokenId)
  if dispute.tokenId == 0:
    amount = dispute.amount * (10 ** 9)
    assert self.merchants[_merchantId].amount >= amount
    send(dispute.recipient, as_wei_value(amount, "wei") + BOND)
  else:
    amount = dispute.amount * decimalOffset
    assert self.merchants[_merchantId].amount >= amount
    ERC20(tokenAddress).transfer(dispute.recipient, amount)
    send(dispute.recipient, BOND)
  self.merchants[_merchantId].amount -= amount
  self.disputes[_txHash].status = STATE_FINALIZED

# @dev getDispute
@public
@constant
def getDispute(
  _txHash: bytes32
) -> (address, uint256, uint256, uint256):
  dispute: Dispute = self.disputes[_txHash]
  return (
    dispute.recipient,
    as_unitless_number(dispute.withdrawableAt),
    dispute.amount,
    dispute.status
  )
