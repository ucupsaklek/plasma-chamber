function opRoll(vm) {
  const n = vm.pop();
  const data = vm.pop();
  const index = vm.contract.stack.length - n;
  vm.contract.stack.splice(index, 0, data);
  //vm.charge(n)
}

module.exports = {
  0x2a: opRoll
}
