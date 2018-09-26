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
  const input = new TransactionOutput(
    [zeroAddress],
    new Asset(zeroAddress, 2)
  );

  it('should run', function(done) {
    const src = fs.readFileSync(path.join(__dirname, '../examples/tictoctoe.chr'));
    const runtime = new Runtime(compiler(src.toString()));
    const outputs = runtime.query('transfer', [oneAddress], [input]);
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0].owners.length, 1);
    assert.equal(outputs[0].owners[0], oneAddress);
    assert.equal(outputs[0].value.assetId, zeroAddress);
    assert.equal(outputs[0].value.amount, 2);
    done()
  });
});
