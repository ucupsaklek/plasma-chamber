const CustomVerifier = artifacts.require("CustomVerifier")
const VerifierUtil = artifacts.require("VerifierUtil")
const OwnershipPredicateContract = artifacts.require("OwnershipPredicate")
const PaymentChannelPredicate = artifacts.require("PaymentChannelPredicate")
const { constants, utils } = require('ethers')
const BigNumber = utils.BigNumber
const {
  assertRevert
} = require('./helpers/assertRevert')
const {
  transactions,
  testAddresses,
  testKeys
} = require('./testdata')
const {
  OwnState,
  Segment,
  SignedTransaction,
  OwnershipPredicate
} = require('@layer2/core')

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract("CustomVerifier", ([alice, bob, operator, user4, user5, admin]) => {

  beforeEach(async () => {
    this.verifierUtil = await VerifierUtil.new({ from: operator })
    this.ownershipPredicate = await OwnershipPredicateContract.new(
      this.verifierUtil.address, { from: operator })
    this.paymentChannelPredicate = await PaymentChannelPredicate.new(
      this.verifierUtil.address, { from: operator })
    this.customVerifier = await CustomVerifier.new(
      this.verifierUtil.address,
      this.ownershipPredicate.address,
      {
        from: operator
      })
    await this.customVerifier.registerPredicate(this.ownershipPredicate.address, {from: operator})
    await this.customVerifier.registerPredicate(this.paymentChannelPredicate.address, {from: operator})
  });

  describe("OwnershipPredicate", () => {

    it("can initiate exit", async () => {
      const segment = Segment.ETH(utils.bigNumberify('0'), utils.bigNumberify('1000000'))
      const stateUpdate = OwnershipPredicate.create(
        segment,
        utils.bigNumberify(4),
        this.ownershipPredicate.address,
        testAddresses.AliceAddress
      )
      const signedTx = new SignedTransaction([stateUpdate])
      const canInitiateExit = await this.customVerifier.canInitiateExit(
        signedTx.getTxHash(),
        signedTx.getTxBytes(),
        testAddresses.AliceAddress,
        segment.toBigNumber(),
        {
          from: alice
        });
      assert.isTrue(canInitiateExit)
    })

    it("can't initiate exit", async () => {
      const segment = Segment.ETH(utils.bigNumberify('0'), utils.bigNumberify('1000000'))
      const stateUpdate = OwnershipPredicate.create(
        segment,
        utils.bigNumberify(4),
        this.ownershipPredicate.address,
        testAddresses.BobAddress
      )
      const signedTx = new SignedTransaction([stateUpdate])

      await assertRevert(this.customVerifier.canInitiateExit(
        signedTx.getTxHash(),
        signedTx.getTxBytes(),
        testAddresses.AliceAddress,
        transactions.segments[0].toBigNumber(),
        {
          from: alice
        }))
    })

    it("can't initiate exit because of invalid segment", async () => {
      const tx = transactions.tx
      await assertRevert(this.customVerifier.canInitiateExit(
        tx.getTxHash(),
        tx.getTxBytes(),
        constants.AddressZero,
        transactions.segments[1].toBigNumber(),
        {
          from: alice
        }))
    })

    /*
    it("can verify deprecation", async () => {
      const tx = transactions.tx
      const canInitiateExit = await this.customVerifier.verifyDeprecation(
        tx.getTxHash(),
        tx.getTxBytes(),
        testAddresses.BobAddress,
        transactions.segments[0].toBigNumber(),
        {
          from: alice
        });
      assert.isTrue(canInitiateExit)
    })
    */

  })
  /*
  describe("SwapTransaction", () => {
    const blkNum3 = utils.bigNumberify('3')
    const blkNum5 = utils.bigNumberify('5')

    const transfer1 = new SignedTransaction([new SplitTransaction(
        testAddresses.AliceAddress,
        Segment.ETH(
          utils.bigNumberify('5000000'),
          utils.bigNumberify('5100000')),
        blkNum3,
        testAddresses.OperatorAddress
      )])
    const transfer2 = new SignedTransaction([new SplitTransaction(
        testAddresses.OperatorAddress,
        Segment.ETH(
          utils.bigNumberify('5100000'),
          utils.bigNumberify('5200000')),
        blkNum5,
        testAddresses.AliceAddress,
      )])
    transfer1.sign(testKeys.AlicePrivateKey)
    transfer2.sign(testKeys.OperatorPrivateKey)

    it("should isSpent", async () => {
      const exitState1 = new OwnState(
        Segment.ETH(
          utils.bigNumberify('5000000'),
          utils.bigNumberify('5100000')),
        alice).withBlkNum(blkNum3)
      const exitState2 = new OwnState(
        Segment.ETH(
          utils.bigNumberify('5100000'),
          utils.bigNumberify('5200000')),
        operator).withBlkNum(blkNum5)
      const evidence2 = await this.customVerifier.getSpentEvidence(
        transfer1.getTxBytes(),
        0,
        transfer1.getSignatures()
      )
      const evidence3 = await this.customVerifier.getSpentEvidence(
        transfer2.getTxBytes(),
        0,
        transfer2.getSignatures()
      )
      const result2 = await this.customVerifier.isSpent(
        transfer1.getTxHash(),
        exitState1.getBytes(),
        evidence2,
        0,
        {
          from: alice
        });
      const result3 = await this.customVerifier.isSpent(
        transfer2.getTxHash(),
        exitState2.getBytes(),
        evidence3,
        0,
        {
          from: alice
        });
      assert.equal(result2, true)
      assert.equal(result3, true)
    })

  })
  */
 /*
  describe("register", () => {

    const blkNum = utils.bigNumberify('3')
    const segment = Segment.ETH(
      utils.bigNumberify('5000000'),
      utils.bigNumberify('5100000'))

    const escrowTx = new SignedTransaction([new EscrowTransaction(
      testAddresses.AliceAddress,
      segment,
      blkNum,
      testAddresses.OperatorAddress,
      testAddresses.BobAddress,
      utils.bigNumberify('12000000'))])
    escrowTx.sign(testKeys.AlicePrivateKey)

    it("should addVerifier", async () => {
      await this.customVerifier.addVerifier(
        this.escrowTxVerifier.address,
        {
          from: operator
        });

      const exitState = new OwnState(segment, alice).withBlkNum(blkNum)
      const evidence = await this.customVerifier.getSpentEvidence(
        escrowTx.getTxBytes(),
        0,
        escrowTx.getSignatures()
      )
      const result = await this.customVerifier.isSpent(
        escrowTx.getTxHash(),
        exitState.getBytes(),
        evidence,
        0,
        {
          from: alice
        });
      assert.equal(result, true)
    })

  })
  */

  describe("parseSegment", () => {

    it("should be parsed", async () => {
      const result = await this.verifierUtil.parseSegment(
        transactions.segment45.toBigNumber(),
        {
          from: alice
        });
      assert.equal(result[0].toNumber(), 0)
      assert.equal(result[1].toNumber(), transactions.segment45.start.toNumber())
      assert.equal(result[2].toNumber(), transactions.segment45.end.toNumber())
    })

    it("should be encoded", async () => {
      const result = await this.verifierUtil.encodeSegment(
        transactions.segment45.getTokenId(),
        transactions.segment45.start,
        transactions.segment45.end,
        {
          from: alice
        });
      assert.equal(result.toString(), transactions.segment45.toBigNumber().toString())
    })

  })

})
