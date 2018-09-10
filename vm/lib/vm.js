const Op = require('./op');
const operationFunc = require('./operations');
const { PlasmaStateValue, PlasmaStateContract } = require('./state');

const TXVM_VERSION = 0x01;

const LOG_INPUT = 0x22;
const LOG_OUTPUT = 0x23;


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
    if (!this.stopAfterFinalize && (this.contract.stack.length > 0 || this.argstack.length > 0)) {
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
    }else if(result.op <= Op.MaxSmallInt) {
      this.push(result.op);
    }else{
      operationFunc[result.op](this);
    }

    console.log('contract stack=', this.contract.stack);
    console.log('argstack=', this.argstack);
    // this.stopAfterFinalize = true;
  }

  charge(n) {
    this.runLimit -= n;
    if(this.runLimit < 0) {
      throw new Error('error run limit');
    }
  }

  createValue(amount, assetId, anchor) {
    return new PlasmaStateValue(amount, assetId, anchor);
  }

  createContract(prog) {
    return new PlasmaStateContract(1, null, prog, []);
  }

  push(v) {
    this.contract.stack.push(v);
  }

  peek() {
    return this.contract.stack[this.contract.stack.length - 1];
  }

  pop() {
    const res = this.contract.stack.pop();
    if(res === null) throw new Error('stack underflow');
    return res;
  }

  popBytes() {
    const res = this.contract.stack.pop();
    if(res === null) throw new Error('stack underflow');
    return res;
  }

  popZeroValue() {
    const res = this.contract.stack.pop();
    if(res === null) throw new Error('stack underflow');
    if(!res.isZero()) throw new Error('value is not zero');
    return res;

  }

  logInput(snapshotId) {
    this.addLog(LOG_INPUT, [snapshotId])
  }

  logOutput(snapshotId) {
    this.addLog(LOG_OUTPUT, [snapshotId])
  }

  addLog(logType, data) {
    this.log.push([logType, data]);
  }

}

VirtualMachine.createVM = function(program) {
  return new VirtualMachine(TXVM_VERSION, new PlasmaStateContract(1, null, program, []));
}

module.exports = VirtualMachine
