/**
 * state transition standard library
 */

const OWN_STATE = 0;

function transfer(inputs, args) {
  const output = inputs[0].clone()
  output.owners = [args[0]];
  return [output];
}

function exchange(inputs, args) {
  const output1 = inputs[0].clone();
  const output2 = inputs[1].clone();
  const swapValue = output1.value;
  output1.value = output2.value;
  output2.value = swapValue;
  return [output1, output2];
}



module.exports = {
  transfer,
  exchange,
  OWN_STATE
}
