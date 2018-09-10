const { PlasmaStateContract, contractSnapshot } = require('../state');

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

function opOutput(vm) {
	//check portable
	const prog = vm.pop();
	// exitor
	const address = vm.pop();
	vm.contract.exitor = address;
	vm.contract.program = prog;
	// amount was on the arg stack
	// how to get weight?
	// check the value on the stack
	// who is exitor?
	const snapshotResult = vm.contract.snapshot();
	// snapshot, snapshotID := vm.contract.snapshot()
	//vm.chargeCreate(snapshot)
	vm.logOutput(snapshotResult[1]);
	vm.unwinding = true    
}

function opInput(vm) {
	const t = vm.pop();
	const snapshotResult = contractSnapshot(t)

	const contract = new PlasmaStateContract(t[0], t[1], t[2], t[3]);
	// vm.chargeCreate(con)
	vm.push(contract)

	vm.logInput(snapshotResult[1])
}

module.exports = {
	0x44: opYield,
	0x47: opOutput,
	0x48: opContract,
	0x2d: opGet,
	0x2e: opPut
}
