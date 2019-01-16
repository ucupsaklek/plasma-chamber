const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const FastFinality = artifacts.require('FastFinality');
const RootChain = artifacts.require('RootChain');
const RLP = require('rlp');

const {
  Block,
  Constants,
  Transaction,
  TransactionOutput
} = require('@cryptoeconomicslab/chamber-core');
const utils = require('ethereumjs-util');
const {
  privKey1,
  privKey2,
  privKey3
} = require('./TestData');
const {
  increaseTime
} = require('openzeppelin-solidity/test/helpers/increaseTime');
const {
  assertRevert
} = require('./helpers/assertRevert');

contract('FastFinality', function ([user, owner, recipient, user4, user5]) {

  // recipient
  const testAddress1 = utils.privateToAddress(privKey1);
  // operator
  const testAddress2 = utils.privateToAddress(privKey2);
  // sender
  const testAddress3 = utils.privateToAddress(privKey3);
  const CHUNK_SIZE = Constants.CHUNK_SIZE;
  const segment = {start: 0, end: CHUNK_SIZE};
  const gasLimit = 300000;
  const OwnState = 0;
  const standardVerificator = 0;
  const TransferLabel = 0;
  const input = new TransactionOutput(
    [testAddress3],
    [segment],
    [OwnState],
    0
  );
  const output = new TransactionOutput(
    [testAddress1],
    [segment],
    [OwnState]
  );
  const invalidOutput = new TransactionOutput(
    [testAddress2],
    [segment],
    [OwnState]
  );
  const tx = new Transaction(
    standardVerificator,
    TransferLabel,
    [testAddress1],
    Math.floor(Math.random() * 100000),
    [input],
    [output]
  );
  const invalidTx = new Transaction(
    standardVerificator,
    TransferLabel,
    [testAddress2],
    Math.floor(Math.random() * 100000),
    [input],
    [invalidOutput]
  );
  const BOND = web3.toWei(10, 'milliether')

  beforeEach(async function () {
    this.rootChain = await RootChain.new({from: owner});
    this.fastFinality = await FastFinality.new(this.rootChain.address, {from: owner});
  });

  describe('deposit', function () {

    it('should success to deposit', async function () {
      const result = await this.fastFinality.deposit({
        value: web3.toWei(2, 'ether'),
        from: owner,
        gas: gasLimit});
      assert.equal(!!result, true);
    });

  });

  describe('buyBandwidth', function () {

    it('should success to buy bandwidth', async function () {
      await this.fastFinality.deposit({
        value: web3.toWei(2, 'ether'),
        from: owner,
        gas: gasLimit});
      const result = await this.fastFinality.buyBandwidth({
        value: web3.toWei(1, 'ether'),
        from: user,
        gas: gasLimit});
      assert.equal(!!result, true);
    });

  });

  describe('dispute', function () {

    it('should success to dispute and finalizeDispute', async function () {
      const txBytes = tx.getBytes();
      const operatorSig = tx.sign(privKey2)
      
      await this.fastFinality.deposit({
        value: web3.toWei(1, 'ether'),
        from: owner,
        gas: gasLimit});

      const result = await this.fastFinality.dispute(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(operatorSig),
        0,
        {
          value: BOND,
          from: user,
          gas: gasLimit});
      assert.equal(!!result, true);

      increaseTime(15 * 24 * 60 * 60);

      const resultFinalizeDispute = await this.fastFinality.finalizeDispute(
        utils.bufferToHex(utils.keccak(txBytes)),
        {
          from: user,
          gas: gasLimit});
      assert.equal(!!resultFinalizeDispute, true);

    });
    
    it('should failed to finalizeDispute', async function () {
      const txBytes = tx.getBytes();
      const operatorSig = tx.sign(privKey2)
      
      await this.fastFinality.deposit({
        value: web3.toWei(1, 'ether'),
        from: owner,
        gas: gasLimit});

      const result = await this.fastFinality.dispute(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(operatorSig),
        0,
        {
          value: BOND,
          from: user,
          gas: gasLimit});
      assert.equal(!!result, true);
      
      await assertRevert(this.fastFinality.finalizeDispute(
        utils.bufferToHex(utils.keccak(txBytes)),
        {
          from: user,
          gas: gasLimit}));

    });
    
  });

  describe('challenge', function () {

    const STATE_FIRST_DISPUTED = 1;
    const STATE_CHALLENGED = 2;
    const STATE_SECOND_DISPUTED = 3;

    const txBytes = tx.getBytes();
    const operatorSig = tx.sign(privKey2)
    const invalidTxBytes = invalidTx.getBytes();
    const invalidTxoperatorSig = invalidTx.sign(privKey2)

    const block1 = new Block();
    const block2 = new Block();
    block1.appendTx(invalidTx);
    block2.appendTx(tx);
    const invalidTxProof = block1.createTXOProof(invalidTx.outputs[0]);
    const proof = block2.createTXOProof(tx.outputs[0]);
    const invalidTxSign = invalidTx.sign(privKey3);
    const sign = tx.sign(privKey3);

    const txInfo = RLP.encode([
      proof,
      sign,
      ''
    ]);
    const invalidTxInfo = RLP.encode([
      invalidTxProof,
      invalidTxSign,
      ''
    ]);

    beforeEach(async function () {
      await this.rootChain.submitBlock(
        utils.bufferToHex(block1.merkleHash()),
        {from: owner, gas: gasLimit});
      await this.rootChain.submitBlock(
        utils.bufferToHex(block2.merkleHash()),
        {from: owner, gas: gasLimit});
      await this.fastFinality.deposit({
        value: web3.toWei(1, 'ether'),
        from: owner,
        gas: gasLimit});

      await this.fastFinality.dispute(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(operatorSig),
        0,
        {
          value: BOND,
          from: user,
          gas: gasLimit});
    });

    it('should be success to challenge', async function () {
      const result = await this.fastFinality.challenge(
        0,
        2,
        utils.bufferToHex(txBytes),
        utils.bufferToHex(txInfo),
        {
          from: owner,
          gas: gasLimit});
      assert.equal(!!result, true);

    });

    it('should be failed to challenge', async function () {

      await assertRevert(this.fastFinality.challenge(
        0,
        1,
        utils.bufferToHex(invalidTxBytes),
        utils.bufferToHex(invalidTxInfo),
        {
          from: owner,
          gas: gasLimit}));
      assert(true);
    
    });

    it('should be success to secondDispute', async function () {
      await this.fastFinality.challenge(
        0,
        2,
        utils.bufferToHex(txBytes),
        utils.bufferToHex(txInfo),
        {
          from: owner,
          gas: gasLimit
        });
      await this.fastFinality.secondDispute(
        utils.bufferToHex(txBytes),
        0,
        1,
        utils.bufferToHex(invalidTxBytes),
        utils.bufferToHex(invalidTxInfo),
        {
          from: owner,
          gas: gasLimit
        });
      const dispute = await this.fastFinality.getDispute(
        utils.bufferToHex(utils.keccak(txBytes)),
        {
          from: owner
        });
      assert.equal(dispute[3], STATE_SECOND_DISPUTED);

    });

  });

});
