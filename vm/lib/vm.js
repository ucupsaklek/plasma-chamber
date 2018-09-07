const Op = require('./op');
const operationFunc = require('./operations');
const { PlasmaStateContract } = require('./state');
const TXVM_VERSION = 0x01;

/**
 * VirtualMachine
 */
class VirtualMachine {
  constructor(txVersion, contract, runLimit) {
    this.txVersion = txVersion;
    this.runLimit = runLimit;
    this.extension = false;
    this.stopAfterFinalize = false;
    this.argstack = [];
    this.run = {
      pc: 0,
      prog: null
    }
    // run
    this.runstack = [];
    this.unwinding = false;
    this.contract = contract;
    this.caller = null;
    this.data = null;
    this.opcode = null;
    this.txid = null;
    this.log = [];
    this.finalized = false;
  }

  validate(prog) {
    this.exec(prog);
    if (!this.stopAfterFinalize && (this.contract.stack.length > 0 || !this.argstack.length > 0)) {
      throw new Error('stack not empty');
    }
  }

  exec(prog) {
    this.run.prog = prog
    this.run.pc = 0
    while(this.run.pc < this.run.prog.length) {
      if (this.unwinding) {
        return
      }
      this.step()
      if (this.finalized && this.stopAfterFinalize) {
        break
      }
    }
  }
  
  step() {
    console.log(this.run.pc);
    const result = Op.decodeInstruction(this.run.prog.slice(this.run.pc));
    this.run.pc += result.n;
    if(result.op >= Op.MinPushdata) {
      // vm.chargeCreate(d)
      this.push(result.data);
    }else{
      operationFunc[result.op](this);
    }

    console.log('contract stack=', this.contract.stack);
    console.log('argstack=', this.argstack);
    // this.stopAfterFinalize = true;
  }

  opSplit(value, amount) {
    return [createValue({
      amount: value.amount - amount,
      assetId: value.assetId,
      anchor: null
    }), createValue({
      amount: amount,
      assetId: value.assetId,
      anchor: null
    })];
  }

  opOutput() {
    //check portable
    //program = vm.popBytes()
    //vm.contract.program = prog
    // amount was on the arg stack
    // how to get weight?
    // check the value on the stack
    //snapshot, snapshotID := vm.contract.snapshot()
    //vm.chargeCreate(snapshot)
    //vm.logOutput(snapshotID)
    //vm.unwinding = true    
  }

  createValue(option) {
    return {
      amount: option.amount,
      assetId: option.assetId,
      anchor: option.anchor
    }
  }

  push(v) {
    this.contract.stack.push(v);
  }

  pop() {
    const res = this.contract.stack.pop();
    if(res === null) throw new Error('stack underflow');
    return res;
  }

}

VirtualMachine.createVM = function(program) {
  return new VirtualMachine(TXVM_VERSION, new PlasmaStateContract(1, null, program, []));
}

module.exports = VirtualMachine
