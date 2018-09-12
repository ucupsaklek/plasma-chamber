const checked = require('../checked');

function opAdd(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	const [v3, check] = checked.AddInt64(v1,v2);

	if(!check) throw new Error('Invalid value:',v1,'+',v2);
	vm.push(v3);
}

function opNeg(vm) {
	const [n, check] = checked.NegateInt64(vm.pop());

	if(!check) throw new Error('Invalid value:',n);
	vm.push(n);
}

function opMul(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	const [v3, check] = checked.MulInt64(v1,v2);

	if(!check) throw new Error('Invalid value:',v1,'*',v2);
	vm.push(v3);
}

function opDiv(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	const [v3, check] = checked.DivInt64(v2,v1);

	if(!check) throw new Error('Invalid value:',v1,'/',v2);
	vm.push(v3);
}

function opMod(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	const [v3, check] = checked.ModInt64(v2,v1);

	if(!check) throw new Error('Invalid value:',v1,'%',v2);
	vm.push(v3);
}

function opGT(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	vm.push(Number(v2 > v1));
}

module.exports = {
	0x21: opAdd,
	0x22: opNeg,
	0x23: opMul,
	0x24: opDiv,
	0x25: opMod,
	0x26: opGT
}
