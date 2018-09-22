const assert = require('assert');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('../lib/tx');
const std = require('../lib/verifier/std');

describe('verifier.std', function() {
  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
  const oneAddress = new Buffer("0000000000000000000000000000000000000001", 'hex');

  describe('transfer', function() {
    const input = new TransactionOutput(
      [zeroAddress],
      new Asset(zeroAddress, 2)
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
      new Asset(zeroAddress, 2),
      [oneAddress, 5]
    );
    const input2 = new TransactionOutput(
      [oneAddress],
      new Asset(oneAddress, 5)
    );

    it('should return exchange output', function() {
      const outputs = std.exchange([input1, input2], [oneAddress]);
      assert.equal(outputs.length, 2);
      assert.equal(outputs[0].owners[0], zeroAddress);
      assert.equal(outputs[0].value.assetId, oneAddress);
      assert.equal(outputs[1].owners[0], oneAddress);
      assert.equal(outputs[1].value.assetId, zeroAddress);
    });

  });

});
