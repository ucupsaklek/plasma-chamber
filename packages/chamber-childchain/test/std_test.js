const utils = require('ethereumjs-util');
const assert = require('assert');
const {
  Transaction,
  TransactionOutput
} = require('@cryptoeconomicslab/chamber-core');
const std = require('../lib/verifier/std');
const testData = require('./testdata');

describe('verifier.std', function() {

  const segment1 = {start:2, end:3};
  const segment2 = {start:4, end:5};
  const privKey1 = testData.privKey1;
  const privKey2 = testData.privKey2;
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const standardVerificator = 0;

  describe('transfer', function() {
    const input = new TransactionOutput(
      [testAddress1],
      [segment1]
    );
    const output = new TransactionOutput(
      [testAddress2],
      [segment1]
    );
    const tx = new Transaction(
      standardVerificator,
      0,    // label
      [testAddress2],  // args
      1,     // nonce,
      [input],
      [output]
    );

    it('should return transfer output', function() {
      const sign = tx.sign(privKey1);
      const outputs = std.transfer(tx.inputs, tx.args, [sign], tx.hash());
      assert.equal(outputs.length, 1);
      assert.equal(outputs[0].owners[0], utils.toChecksumAddress(utils.bufferToHex(testAddress2)));
    });

  });

  describe('exchange', function() {
    const input1 = new TransactionOutput(
      [testAddress1],
      [segment1],
      [segment2]
    );
    const input2 = new TransactionOutput(
      [testAddress2],
      [segment2]
    );

    it('should return exchange output', function() {
      const outputs = std.exchange([input1, input2], [testAddress2]);
      assert.equal(outputs.length, 2);
      assert.equal(outputs[0].owners[0], utils.toChecksumAddress(utils.bufferToHex(testAddress1)));
      assert.equal(outputs[1].owners[0], utils.toChecksumAddress(utils.bufferToHex(testAddress2)));
      assert.equal(outputs[0].value[0].start.toString(), segment2.start.toString());
      assert.equal(outputs[1].value[0].start.toString(), segment1.start.toString());
    });

  });

});
