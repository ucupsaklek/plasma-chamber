const {
	PlasmaStateContract,
	PlasmaStateValue,
	contractSnapshot
} = require('../state');

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

function opCall(vm) {
	const con = vm.pop();

	// check contract
	if(!con instanceof PlasmaStateContract) {
		throw new Error('not contract');
	}

	con.typecode = 'C';

	const prevContract = vm.contract
	const prevCaller = vm.caller

	vm.caller = vm.contract.seed
	vm.contract = con

	vm.exec(con.program)

	if(!vm.unwinding && vm.contract.stack.length > 0) {
		throw new Error('contract stack not empty', con.seed);
	}

	vm.unwinding = false
	vm.contract = prevContract
	vm.caller = prevCaller
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
	const typecode = t.pop();
	const seed = t.pop();
	const prog = t.pop();
	const stack = t.map(s => {
		if(s[s.length - 1] == 'S') return s[0];
		else if(s[s.length - 1] == 'V') return new PlasmaStateValue(s[2], s[1], s[0]);
		else return s;
	}).reverse();
	console.log('stack', stack)
	const contract = new PlasmaStateContract(typecode, seed, prog, stack);
	// vm.chargeCreate(con)
	vm.push(contract)
	vm.logInput(snapshotResult[1])
}

module.exports = {
	0x43: opCall,
	0x44: opYield,
	0x46: opInput,
	0x47: opOutput,
	0x48: opContract,
	0x2d: opGet,
	0x2e: opPut
}
