const utils = require('ethereumjs-util');
const assert = require('assert');
const {
  Transaction,
  TransactionOutput
} = require('../lib/tx');
const std = require('../lib/verifier/std');

describe('verifier.std', function() {
  const coinId1 = 1;
  const coinId2 = 2;
  const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
  const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);

  describe('transfer', function() {
    const input = new TransactionOutput(
      [testAddress1],
      [coinId1]
    );
    const output = new TransactionOutput(
      [testAddress2],
      [coinId1]
    );
    const tx = new Transaction(
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
      assert.equal(outputs[0].owners[0], testAddress2);
    });

  });

  describe('exchange', function() {
    const input1 = new TransactionOutput(
      [testAddress1],
      [coinId1],
      [coinId2]
    );
    const input2 = new TransactionOutput(
      [testAddress2],
      [coinId2]
    );

    it('should return exchange output', function() {
      const outputs = std.exchange([input1, input2], [testAddress2]);
      assert.equal(outputs.length, 2);
      assert.equal(outputs[0].owners[0], testAddress1);
      assert.equal(outputs[0].value[0], coinId2);
      assert.equal(outputs[1].owners[0], testAddress2);
      assert.equal(outputs[1].value[0], coinId1);
    });

  });

});
