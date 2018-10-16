const assert = require('assert');
const fs = require('fs');
const path = require('path');
const compiler = require('../lib/compiler');
const {
  Runtime
} = require('../lib/runtime');
const {
  TransactionOutput
} = require('../../../childchain');

describe('runtime', function() {

  const zeroAddress = 0;
  const oneAddress = 1;
  const coinAddress = 2;
  const asset1Address = 11;
  const asset2Address = 12;

  it('should run transfer', function(done) {
    const input = new TransactionOutput(
      [zeroAddress],
      [coinAddress]
    );

    const src = fs.readFileSync(path.join(__dirname, '../examples/transfer.chr'));
    const runtime = new Runtime(compiler(src.toString()));
    const outputs = runtime.query('transfer', [oneAddress], [input]);
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0].owners.length, 1);
    assert.equal(outputs[0].owners[0], oneAddress);
    assert.equal(outputs[0].value[0], [coinAddress]);
    done()
  });

  /*

  it('should run exchange', function(done) {
    const input1 = new TransactionOutput(
      [zeroAddress],
      [asset1Address]
      [asset2Address]
    );
    const input2 = new TransactionOutput(
      [oneAddress],
      [asset2Address]
    );

    const src = fs.readFileSync(path.join(__dirname, '../examples/exchange.chr'));
    const runtime = new Runtime(compiler(src.toString()));
    const outputs = runtime.query('exchange', [], [input1, input2]);
    assert.equal(outputs.length, 2);
    assert.equal(outputs[0].owners.length, 1);
    console.log(outputs[0])
    assert.equal(outputs[0].value[0], asset1Address);
    assert.equal(outputs[0].owners[0], oneAddress);
    assert.equal(outputs[1].owners.length, 1);
    assert.equal(outputs[1].value[0], asset2Address);
    assert.equal(outputs[1].owners[0], zeroAddress);
    done()
  });

  it('should failed to run exchange', function(done) {
    const input1 = new TransactionOutput(
      [zeroAddress],
      asset1Address,
      [coinAddress]
    );
    const input2 = new TransactionOutput(
      [oneAddress],
      [asset2Address]
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
  */

});
