const MAX_INT64 = Math.pow(2,32) - 1
const MIN_INT64 = 1- Math.pow(2,32) 

function AddInt64(a,b) {
	if ((b > 0 && a > MAX_INT64 - b) || (b < 0 && a < MIN_INT64 - b)) {
		return [0, false];
	}
	return [a + b, true];
}

/*
function SubInt64(a,b) {
	if ((b > 0 && a > MIN_INT64 + b) || (b < 0 && a < MAX_INT64 + b)) {
		return [0, false];
	}
	return [a - b, true];
}
*/

function MulInt64(a,b) {
	if ((a > 0 && b > 0 && a > MAX_INT64 / b) ||
		(a > 0 && b <= 0 && b < MIN_INT64 / a) ||
		(a <= 0 && b > 0 && a < MIN_INT64 / b) ||
		(a < 0 && b <= 0 && b < MAX_INT64 / a)) {
		return [0, false];
	}
	return [a * b, true];
}

function DivInt64(a,b) {
	if ((b === 0) || (a === MAX_INT64 && b === -1)) {
		return [0, false];
	}
	return [Math.floor(a / b), true];
}

function ModInt64(a,b) {
	if ((b === 0) || (a === MAX_INT64 && b === -1)) {
		return [0, false];
	}
	return [a % b, true];
}

function NegateInt64(a) {
	if (a === MIN_INT64) {
		return [0, false];
	}
	return [-a, true];
}

module.exports = {
	AddInt64,
	//SubInt64,
	MulInt64,
	DivInt64,
	ModInt64,
	NegateInt64
}
