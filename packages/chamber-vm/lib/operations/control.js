
function opVerify(vm) {
  const b = vm.pop();
  if(!b) {
    throw new Error('failed to verify');
  }
}

module.exports = {
  0x40: opVerify
}
