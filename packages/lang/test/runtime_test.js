const assert = require('assert');
const fs = require('fs');
const path = require('path');
const compiler = require('../lib/compiler');
const {
  Runtime
} = require('../lib/runtime');
const {
  Asset,
  TransactionOutput
} = require('../../../childchain');

describe('runtime', function() {

  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
  const oneAddress = new Buffer("0000000000000000000000000000000000000001", 'hex');
  const asset1Address = new Buffer("0000000000000000000000000000000000000101", 'hex');
  const asset2Address = new Buffer("0000000000000000000000000000000000000102", 'hex');

  it('should run transfer', function(done) {
    const input = new TransactionOutput(
      [zeroAddress],
      new Asset(zeroAddress, 2)
    );

    const src = fs.readFileSync(path.join(__dirname, '../examples/transfer.chr'));
    const runtime = new Runtime(compiler(src.toString()));
    const outputs = runtime.query('transfer', [oneAddress], [input]);
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0].owners.length, 1);
    assert.equal(outputs[0].owners[0], oneAddress);
    assert.equal(outputs[0].value.assetId, zeroAddress);
    assert.equal(outputs[0].value.amount, 2);
    done()
  });

  it('should run exchange', function(done) {
    const input1 = new TransactionOutput(
      [zeroAddress],
      new Asset(asset1Address, 2),
      [asset2Address, 5]
    );
    const input2 = new TransactionOutput(
      [oneAddress],
      new Asset(asset2Address, 5)
    );

    const src = fs.readFileSync(path.join(__dirname, '../examples/exchange.chr'));
    const runtime = new Runtime(compiler(src.toString()));
    const outputs = runtime.query('exchange', [], [input1, input2]);
    assert.equal(outputs.length, 2);
    assert.equal(outputs[0].owners.length, 1);
    assert.equal(outputs[0].value.assetId, asset1Address);
    assert.equal(outputs[0].value.amount, 2);
    assert.equal(outputs[0].owners[0], oneAddress);
    assert.equal(outputs[1].owners.length, 1);
    assert.equal(outputs[1].value.assetId, asset2Address);
    assert.equal(outputs[1].value.amount, 5);
    assert.equal(outputs[1].owners[0], zeroAddress);
    done()
  });

  it('should failed to run exchange', function(done) {
    const input1 = new TransactionOutput(
      [zeroAddress],
      new Asset(asset1Address, 2),
      [asset2Address, 2]
    );
    const input2 = new TransactionOutput(
      [oneAddress],
      new Asset(asset2Address, 5)
    );

    const src = fs.readFileSync(path.join(__dirname, '../examples/exchange.chr'));
    const runtime = new Runtime(compiler(src.toString()));
    try {
      const outputs = runtime.query('exchange', [], [input1, input2]);
      assert.equal(outputs, undefined);
    } catch (e) {
      assert.equal(e.message, 'not match at hasAsset');
    }
    done()
  });

});
