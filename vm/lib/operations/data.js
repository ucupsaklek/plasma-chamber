function opDrop(vm) {
  vm.pop();
}

function opDup(vm) {
  const item = vm.contract.stack[vm.contract.stack.length - 1];
  if(item === undefined) {
    throw new Error('want at Dup');
  }
	// vm.chargeCopy(item)
	vm.push(item)
}

function opEq(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	vm.push(v1 === v2);
}

function opTuple(vm) {
  const n = vm.pop();
  const vals = [];
	if(n > vm.contract.stack.length || n < 0) {
    throw new Error('underflow', 'tuple', n);
  }
  for(var i = 0;i < n;i++) {
    vals.push(vm.pop());
  }
	// vm.chargeCreate(vals)
	vm.push(vals);
}

function opUntuple(vm) {
  const t = vm.pop();
  t.forEach((v) => {
    vm.push(v);
  })
	vm.push(t.length);
	// vm.charge(int64(len(t)))
}

function opLen(vm) {
  const d = vm.pop();
  vm.push(d.length);
}

module.exports = {
  0x50: opEq,
  0x51: opDup,
  0x52: opDrop,
  0x54: opTuple,
  0x55: opUntuple,
  0x56: opLen
}

