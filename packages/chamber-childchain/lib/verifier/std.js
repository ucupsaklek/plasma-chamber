/**
 * state transition standard library
 */

const utils = require('ethereumjs-util');
const {
  TransactionOutput,
  Transaction
} = require('@cryptoeconomicslab/chamber-core');
const OWN_STATE = 0;

function transfer(inputs, args, sigs, hash) {
  checkSigs(
    inputs[0].owners,
    sigs,
    hash
  )

  const output = new TransactionOutput([args[0]], inputs[0].value, inputs[0].state);
  return [output];
}

function split(inputs, args, sigs, hash) {
  checkSigs(
    inputs[0].owners,
    sigs,
    hash
  )

  const amount = BufferUtils.bufferToNum(args[1]);
  const output1 = new TransactionOutput(
    [args[0]],
    [{
      start: inputs[0].value[0].start,
      end: inputs[0].value[0].start.plus(amount)
    }],
    inputs[0].state
  );
  const output2 = new TransactionOutput(
    inputs[0].owners,
    [{
      start: inputs[0].value[0].start.plus(amount),
      end: inputs[0].value[0].end
    }],
    inputs[0].state
  );
  return [output1, output2];
}

function exchange(inputs, args) {
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
    return utils.bufferToHex(utils.pubToAddress(pubKey)) === owners[i];
  });
  if(unmatchSigs != 0) {
    throw new Error('signatures not match');
  }
}

module.exports = {
  transfer,
  split,
  exchange,
  OWN_STATE
}
