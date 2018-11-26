const { 
	Assembler,
	assembleSource,
	assembleScanner,
	Macro,
	opcode
} = require('../asm/asm')

function opNot(vm) {
	const bool = vm.pop();
	vm.pushBool(!bool);
}
function opAnd(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	vm.pushBool(v1 && v2);
}

function opOr(vm) {
	const v1 = vm.pop();
	const v2 = vm.pop();
	vm.pushBool(v1 || v2);
}

module.exports = {
	[opcode["not"]]: opNot,
	[opcode["and"]]: opAnd,
	[opcode["or"]]: opOr
};
