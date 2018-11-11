/**
 * state transition standard library
 */

const utils = require('ethereumjs-util');

function transfer(inputs, args, sigs, hash) {
  const output = inputs[0].clone()

  checkSigs(
    inputs[0].owners,
    sigs,
    hash
  )

  output.owners = [args[0]];
  return [output];
}

function exchange(inputs, args) {
  const order = inputs[0].state[0];
  if(inputs[1].value[0] != order) throw new Error('order not match');
  const output1 = inputs[0].clone();
  const output2 = inputs[1].clone();
  const swapValue = output1.value;
  output1.value = output2.value;
  output2.value = swapValue;
  return [output1, output2];
}

function checkSigs(owners, sigs, hash) {
  if(sigs.length != owners.length) {
    throw new Error('signatures not enough');
  }
  const unmatchSigs = sigs.filter((sig, i) => {
    var pubKey = utils.ecrecover(
      new Buffer(hash, 'hex'),
      sig.slice(64, 65).readUInt8(0),
      sig.slice(0, 32),
      sig.slice(32, 64)
    );
    return Buffer.compare(utils.pubToAddress(pubKey), owners[i]) != 0;
  });
  if(unmatchSigs != 0) {
    throw new Error('signatures not match');
  }
}

module.exports = {
  transfer,
  exchange
}
