const {
  duration,
  increaseTime,
} = require('./helpers/increaseTime')
const {
  assertRevert
} = require('./helpers/assertRevert');

const FastFinality = artifacts.require("FastFinality")
const RootChain = artifacts.require("RootChain")
const Checkpoint = artifacts.require("Checkpoint")
const CustomVerifier = artifacts.require("CustomVerifier")
const VerifierUtil = artifacts.require("VerifierUtil")
const OwnershipPredicateContract = artifacts.require("OwnershipPredicate")
const PaymentChannelPredicate = artifacts.require("SwapChannelPredicate")
const Serializer = artifacts.require("Serializer")
const ERC721 = artifacts.require("ERC721")
const ethers = require('ethers')
const utils = ethers.utils
const BigNumber = utils.BigNumber

const {
  constants,
  OwnershipPredicate
} = require('@layer2/core')

const {
  Scenario3,
  testAddresses
} = require('./testdata')

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const BOND = constants.EXIT_BOND

contract("FastFinality", ([alice, bob, operator, merchant, user5, admin]) => {

  const tokenId = 0

  beforeEach(async () => {
    this.erc721 = await ERC721.new()
    this.checkpoint = await Checkpoint.new({ from: operator })
    this.verifierUtil = await VerifierUtil.new({ from: operator })
    this.ownershipPredicate = await OwnershipPredicateContract.new(
      this.verifierUtil.address, { from: operator })
    this.serializer = await Serializer.new({ from: operator })
    this.customVerifier = await CustomVerifier.new(
      this.verifierUtil.address,
      this.ownershipPredicate.address,
      {
        from: operator
      })
    await this.customVerifier.registerPredicate(this.ownershipPredicate.address, {from: operator})
    this.rootChain = await RootChain.new(
      this.verifierUtil.address,
      this.serializer.address,
      this.customVerifier.address,
      this.erc721.address,
      this.checkpoint.address,
      {
        from: operator
      })
    await this.rootChain.setup()
    this.paymentChannelPredicate = await PaymentChannelPredicate.new(
      this.verifierUtil.address,
      this.rootChain.address,
      { from: operator })
    await this.customVerifier.registerPredicate(this.paymentChannelPredicate.address, {from: operator})
    this.fastFinality = await FastFinality.new(
      this.rootChain.address,
      this.customVerifier.address,
      this.erc721.address,
      {
        from: operator
      })
    const getTokenAddressResult = await this.fastFinality.getTokenAddress.call()
    this.ffToken = await ERC721.at(getTokenAddressResult)
  })

  describe('depositAndMintToken', () => {

    it('should succeed to deposit and withdraw', async () => {
      const result = await this.fastFinality.depositAndMintToken(
        7 * 24 * 60 * 60,
        {
          from: operator,
          value: utils.parseEther('1')
        }
      )
      const merchantId = result.logs[0].args._merchantId.toString()
      await this.ffToken.approve(merchant, merchantId, {
        from: operator
      })
      await this.ffToken.transferFrom(operator, merchant, merchantId, {
        from: merchant
      })
      increaseTime(8 * 24 * 60 * 60)
      await this.fastFinality.withdrawAndBurnToken(
        merchantId,
        {
          from: operator
        }
      )

    })

  })


  describe('dispute', () => {

    const prevBlkNum = utils.bigNumberify(5)
    const prevOutput = OwnershipPredicate.create(
      Scenario3.segments[0],
      prevBlkNum,
      ethers.constants.AddressZero,
      testAddresses.AliceAddress)

    beforeEach(async () => {
      const result = await this.fastFinality.depositAndMintToken(
        8 * 7 * 24 * 60 * 60,
        {
        from: operator,
        value: utils.parseEther('2')
      })
      const merchantId = result.logs[0].args._merchantId.toString()
      await this.ffToken.approve(bob, merchantId, {
        from: operator
      })
      await this.ffToken.transferFrom(operator, bob, merchantId, {
        from: bob
      })
    })

    it('should succeed to dispute and finalizeDispute', async () => {
      const tx = Scenario3.blocks[0].transactions[0]
      const operatorSig = Scenario3.blocks[0].operatorSignes[0]
      await this.fastFinality.dispute(
        prevOutput.encode(),
        tx.getTxBytes(),
        tx.getTransactionWitness(),
        operatorSig,
        Scenario3.segments[0].toBigNumber(),
        {
          value: BOND,
          from: bob
        })
      
      increaseTime(15 * 24 * 60 * 60)
      
      await this.fastFinality.finalizeDispute(
        0,
        tx.getTxHash(),
        {
          from: bob
        })

    });
    
    it('should fail to finalizeDispute', async () => {
      Scenario3.blocks[0].block.setSuperRoot(constants.ZERO_HASH)
      const tx = Scenario3.blocks[0].block.getSignedTransactionWithProof(
        Scenario3.blocks[0].transactions[0].hash())[0]
      const operatorSig = Scenario3.blocks[0].operatorSignes[0]

      await this.fastFinality.dispute(
        prevOutput.encode(),
        tx.getTxBytes(),
        tx.getSignatures(),
        operatorSig,
        Scenario3.segments[2].toBigNumber(),
        {
          value: BOND,
          from: bob
        })

      await assertRevert(this.fastFinality.finalizeDispute(
        0,
        tx.getTxHash(),
        {
          from: bob
        }))

    })

  })

  describe('challenge', () => {

    const STATE_FIRST_DISPUTED = 1;
    const STATE_CHALLENGED = 2;
    const STATE_SECOND_DISPUTED = 3;
    const prevBlkNum = utils.bigNumberify(5)
    const prevOutput = OwnershipPredicate.create(
      Scenario3.segments[0],
      prevBlkNum,
      ethers.constants.AddressZero,
      testAddresses.AliceAddress)
    
    beforeEach(async () => {
      const submit = async (block) => {
        const result = await this.rootChain.submit(
          block.getRoot(),
          {
            from: operator
          });
        block.setBlockTimestamp(utils.bigNumberify(result.logs[0].args._timestamp.toString()))
        block.setSuperRoot(result.logs[0].args._superRoot)
      }
      await submit(Scenario3.blocks[0].block)
      await submit(Scenario3.blocks[1].block)

      const tx = Scenario3.blocks[0].transactions[0]
      const operatorSig = Scenario3.blocks[0].operatorSignes[0]

      await this.fastFinality.dispute(
        prevOutput.encode(),
        tx.getTxBytes(),
        tx.getTransactionWitness(),
        operatorSig,
        Scenario3.segments[2].toBigNumber(),
        {
          value: BOND,
          from: bob
        })
    });

    it('should be succeeded to challenge', async () => {
      const tx = Scenario3.blocks[0].block.getSignedTransactionWithProof(
        Scenario3.blocks[0].transactions[0].hash())[0]
      await this.fastFinality.challenge(
        tx.getTxBytes(),
        tx.getProofAsHex(),
        2,
        Scenario3.segments[0].toBigNumber(),
        {
          from: operator,
          gas: '500000'
        })
    });

    it('should be failed to challenge', async () => {
      const invalidTx = Scenario3.blocks[1].block.getSignedTransactionWithProof(
        Scenario3.blocks[1].transactions[0].hash())[0]
      
      await assertRevert(this.fastFinality.challenge(
        invalidTx.getTxBytes(),
        invalidTx.getProofAsHex(),
        2,
        Scenario3.segments[1].toBigNumber(),
        {
          from: operator,
          gas: '500000'
        }))
    })

    it('should be succeeded to secondDispute', async () => {
      const tx = Scenario3.blocks[0].block.getSignedTransactionWithProof(
        Scenario3.blocks[0].transactions[0].hash())[0]
      const secondDisputeTx = Scenario3.blocks[1].block.getSignedTransactionWithProof(
        Scenario3.blocks[1].transactions[0].hash())[0]
      await this.fastFinality.challenge(
        tx.getTxBytes(),
        tx.getProofAsHex(),
        2,
        Scenario3.segments[0].toBigNumber(),
        {
          from: operator
        })
      await this.fastFinality.secondDispute(
        prevOutput.encode(),
        tx.getTxBytes(),
        secondDisputeTx.getTxBytes(),
        secondDisputeTx.getProofAsHex(),
        secondDisputeTx.getSignatures(),
        4,
        Scenario3.segments[0].toBigNumber(),
        {
          from: operator
        });
      const dispute = await this.fastFinality.getDispute(
        tx.getTxHash(),
        {
          from: operator
        });
      assert.equal(dispute[3], STATE_SECOND_DISPUTED);

    })

  })

})
