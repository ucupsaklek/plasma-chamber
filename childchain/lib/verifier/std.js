/**
 * state transition standard library
 */

const {
  Asset
} = require('../tx');

function transfer(inputs, args) {
  const output = inputs[0].clone()
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



module.exports = {
  transfer,
  exchange
}
