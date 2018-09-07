function opGet(vm) {
  const item = vm.argstack.pop();
	if(item === null) {
    throw new Error('argstack underflow in get operation');
	}
	vm.push(item)
}

function opPut(vm) {
	const item = vm.pop()
	vm.argstack.push(item)
}

module.exports = {
  0x2d: opGet,
  0x2e: opPut
}
