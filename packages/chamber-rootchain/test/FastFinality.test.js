const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const FastFinality = artifacts.require('FastFinality');

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

contract('FastFinality', function ([user, owner, recipient, user4, user5]) {

  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const CHUNK_SIZE = Constants.CHUNK_SIZE;
  const gasLimit = 300000;

  beforeEach(async function () {
    this.fastFinality = await FastFinality.new();
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

});
