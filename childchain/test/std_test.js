const utils = require('ethereumjs-util');
const assert = require('assert');
const {
  Transaction,
  TransactionOutput
} = require('../lib/tx');
const std = require('../lib/verifier/std');

describe('verifier.std', function() {
  const coinId = {start:0, end:1};
  const coinId1 = {start:2, end:3};
  const coinId2 = {start:4, end:5};
  const zeroAddress = utils.bufferToHex(new Buffer("0000000000000000000000000000000000000000", 'hex'));
  const oneAddress = utils.bufferToHex(new Buffer("0000000000000000000000000000000000000001", 'hex'));

  describe('transfer', function() {
    const input = new TransactionOutput(
      [zeroAddress],
      [coinId]
    );

    it('should return transfer output', function() {
      const outputs = std.transfer([input], [oneAddress]);
      assert.equal(outputs.length, 1);
      assert.equal(outputs[0].owners[0], oneAddress);
    });

  });

  describe('exchange', function() {
    const input1 = new TransactionOutput(
      [zeroAddress],
      [coinId1],
      [coinId2]
    );
    const input2 = new TransactionOutput(
      [oneAddress],
      [coinId2]
    );

    it('should return exchange output', function() {
      const outputs = std.exchange([input1, input2], [oneAddress]);
      assert.equal(outputs.length, 2);
      assert.equal(outputs[0].owners[0], zeroAddress);
      assert.equal(outputs[0].value[0].start.toString(), coinId2.start.toString());
      assert.equal(outputs[1].owners[0], oneAddress);
      assert.equal(outputs[1].value[0].start.toString(), coinId1.start.toString());
    });

  });

});
