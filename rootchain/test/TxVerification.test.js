const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const TxVerificationTest = artifacts.require('TxVerificationTest');

const {
  BufferUtils,
  Transaction,
  TransactionOutput
} = require('../../childchain/lib/tx');
const utils = require('ethereumjs-util');
const BigNumber = require('bignumber.js');

contract('TxVerificationTest', function ([user, owner, recipient, user4, user5]) {

  const privKey1 = new Buffer('c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', 'hex')
  const privKey2 = new Buffer('ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', 'hex')
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const CHUNK_SIZE = BigNumber('1000000000000000000');
  const coin1Id = {start: 0, end: CHUNK_SIZE.minus(1)};
  const gasLimit = 200000;

  beforeEach(async function () {
    this.txVerificationTest = await TxVerificationTest.new();
  });

  describe('verifyTransaction', function () {

    it('should verify transaction', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        [coin1Id],
        [0],
        0
      );
      const output = new TransactionOutput(
        [testAddress2],
        [coin1Id],
        [0]
      );
      const tx = new Transaction(
        0,
        [testAddress2],
        new Date().getTime(),
        [input],
        [output]
      );
      let txBytes = tx.getBytes();
      const sign = tx.sign(privKey1)
      const result = await this.txVerificationTest.verifyTransaction(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(sign),
        {from: user, gas: gasLimit});
      assert.equal(result, 0);
    });

    it('should verify game transaction', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        [coin1Id],
        [testAddress1, testAddress2, BufferUtils.numToBuffer(3), BufferUtils.numToBuffer(0)],
        0,0,0
      );
      const output = new TransactionOutput(
        [testAddress2],
        [coin1Id],
        [testAddress2, testAddress1, BufferUtils.numToBuffer(4), BufferUtils.numToBuffer(0)]
      );
      const tx = new Transaction(
        100,
        [BufferUtils.numToBuffer(0), BufferUtils.numToBuffer(1)],
        new Date().getTime(),
        [input],
        [output]
      );
      let txBytes = tx.getBytes();
      const sign = tx.sign(privKey1)
      const result = await this.txVerificationTest.verifyTransaction(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(sign),
        {from: user, gas: gasLimit});
      assert.equal(result, 0);
    });

  });


});
