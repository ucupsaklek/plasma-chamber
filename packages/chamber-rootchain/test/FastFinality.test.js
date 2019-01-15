const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const FastFinality = artifacts.require('FastFinality');
const RootChain = artifacts.require('RootChain');

const {
  Constants,
  Transaction,
  TransactionOutput
} = require('@cryptoeconomicslab/chamber-core');
const utils = require('ethereumjs-util');
const {
  privKey1,
  privKey2
} = require('./TestData');
const {
  increaseTime
} = require('openzeppelin-solidity/test/helpers/increaseTime');
const {
  assertRevert
} = require('./helpers/assertRevert');

contract('FastFinality', function ([user, owner, recipient, user4, user5]) {

  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const CHUNK_SIZE = Constants.CHUNK_SIZE;
  const segment = {start: 0, end: CHUNK_SIZE};
  const gasLimit = 300000;

  beforeEach(async function () {
    this.rootChain = await RootChain.new();
    this.fastFinality = await FastFinality.new(this.rootChain.address, {from: owner});
  });

  describe('deposit', function () {

    it('should success to deposit', async function () {
      const result = await this.fastFinality.deposit({
        value: '1000000',
        from: owner,
        gas: gasLimit});
      assert.equal(!!result, true);
    });

  });

  describe('buyBandwidth', function () {

    it('should success to buy bandwidth', async function () {
      const result = await this.fastFinality.deposit({
        value: '200000',
        from: user,
        gas: gasLimit});
      assert.equal(!!result, true);
    });

  });

  describe('dispute', function () {

    const OwnState = 0;
    const standardVerificator = 0;
    const TransferLabel = 0;
    const input = new TransactionOutput(
      [testAddress2],
      [segment],
      [OwnState],
      0
    );
    const output = new TransactionOutput(
      [testAddress1],
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

});
