if(!process.env.DEBUG) console.log(`
||||||||||||||||||||||||||||||||||||||||||||||||||||||||
||||||||||||||||||||||||||||||||||||||||||||||||||||||||
||||||||||||||||||||||||||||||||||||||||||||||||||||||||
||||| If you want VM debug log, use DEBUG env val. |||||
||||||||||||||||||||||||||||||||||||||||||||||||||||||||
||||||||||||||||||||||||||||||||||||||||||||||||||||||||
||||||||||||||||||||||||||||||||||||||||||||||||||||||||
`)

const Op = require('./op');
const operationFunc = require('./operations');
const { PlasmaStateValue, PlasmaStateContract } = require('./state');

const TXVM_VERSION = 0x01;

const LOG_INPUT = 0x22;
const LOG_OUTPUT = 0x23;
const LOG_FINALIZE = 0x24;

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
    if(this.run.prog && this.run.prog.length > 0) {
      this.runstack.push(Object.assign({}, this.run));
    }
    this.run.prog = prog
    this.run.pc = 0
    try {
      while(this.run.pc < this.run.prog.length) {
        if (this.unwinding) {
          break
        }
        this.step()
        if (this.finalized && this.stopAfterFinalize) {
          break
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.run = this.runstack.pop();
    }
  }
  
  step() {
    const result = Op.decodeInstruction(this.run.prog.slice(this.run.pc));
    this.run.pc += result.n;
    if(process.env.DEBUG) console.log('Debug =====Start=====');
    if(process.env.DEBUG) console.log(result.op, operationFunc[result.op] ? operationFunc[result.op].name : '');
    if(result.op >= Op.MinPushdata) {
      // vm.chargeCreate(d)
      this.push(result.data);
    }else if(result.op <= Op.MaxSmallInt) {
      this.push(result.op);
    }else{
      operationFunc[result.op](this);
    }
    if(process.env.DEBUG) console.log('contract stack=', this.contract.stack);
    if(process.env.DEBUG) console.log('argstack=', this.argstack);
    if(process.env.DEBUG) console.log('unwinding=', this.unwinding);
    if(process.env.DEBUG) console.log('Debug =====End=====');
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
  pushBool(v) {
    this.push(Number(v));
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

  logFinalize(anchor) {
    this.addLog(LOG_FINALIZE, [anchor])
  }

  addLog(logType, data) {
    this.log.push([logType, data]);
  }

}

VirtualMachine.createVM = function(program) {
  return new VirtualMachine(TXVM_VERSION, new PlasmaStateContract(1, null, program, []));
}

module.exports = VirtualMachine
