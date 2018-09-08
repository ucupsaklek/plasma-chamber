function opContract(vm) {
  const prog = vm.popBytes();
	const con = vm.createContract(prog)
	vm.push(con)
}

function opYield(vm) {
	const prog = vm.popBytes();
	vm.contract.program = prog
	vm.argstack.push(vm.contract)
	vm.unwinding = true
}

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
	0x44: opYield,
	0x48: opContract,
	0x2d: opGet,
	0x2e: opPut
}
