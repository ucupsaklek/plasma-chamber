const MinSmallInt = 0x0;
const MaxSmallInt = 0x1f;
const MinPushdata = 0x5f;

function decodeInstruction(prog) {
  if(prog.length == 0) {
    return {op: 0, n: 0}
  }
  const opcode = prog[0];
	if(opcode < MinPushdata) {
    return {op: opcode, n: 1};
  }
  const l = opcode - MinPushdata;
  const r = 1 + l;
  if( prog.length < r)
	if(prog.length < r) {
    return {op: MinPushdata, n: 0};
	}
  return {op: MinPushdata, n: r, data: prog.slice(1, r)};
}

module.exports = {
  decodeInstruction: decodeInstruction,
  MinSmallInt: MinSmallInt,
  MaxSmallInt: MaxSmallInt,
  MinPushdata: MinPushdata
}
