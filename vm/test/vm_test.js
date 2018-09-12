const assert = require('assert');
const VirtualMachine = require('../lib/vm');

describe('VirtualMachine', function() {

  describe('pushData', function() {
    it('should push 1byte', function() {
      // transfer
      const program = [0x60, 0x01, 0x2e, 0x2d];
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [[1]]);
    });
    it('should push 2byte', function() {
      // transfer
      const program = [0x61, 0x01, 0x02, 0x2e, 0x2d];
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [[1, 2]]);
    });
  });

  describe('opPut', function() {
    it('should put', function() {
      // transfer
      const program = [0x60, 0x01, 0x2e, 0x2d];
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.argstack, [[1]]);
    });
  });

  describe('opGet', function() {
    it('should get', function() {
      // transfer
      const program = [0x60, 0x01, 0x2e, 0x2d];
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [[1]]);
    });
  });

  describe('opRoll', function() {
    it('should roll 1', function() {
      // transfer
      const program = [0x60, 0x01, 0x60, 0x02, 0x01, 0x2a];
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [[2], [1]]);
    });
  });

  describe('opAdd', function() {
    it('should add', function() {
      const program = [0x01, 0x02, 0x21]; // 0x01 0x02 opAdd
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x03]);
    });
  });

  describe('opNeg', function() {
    it('should negate', function() {
      const program = [0x01, 0x22]; // 0x01 opNeg
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [-0x01]);
    });
  });

  describe('opMul', function() {
    it('should mul', function() {
      const program = [0x02, 0x03, 0x23]; // 0x02 0x03 opMul
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x06]);
    });
  });

  describe('opDiv', function() {
    it('should div', function() {
      const program = [0x05, 0x02, 0x24]; // 0x05 0x02 opDiv
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x02]);
    });
  });

  describe('opMod', function() {
    it('should mod', function() {
      const program = [0x05, 0x02, 0x25]; // 0x05 0x02 opMod
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x01]);
    });
  });

  describe('opGT', function() {
    it('should mod', function() {
      const program = [0x05, 0x02, 0x25]; // 0x05 0x02 opMod
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x01]);
    });
  });

  describe('opGT', function() {
    it('should gt true', function() {
      const program = [0x02, 0x01, 0x26]; // 0x02 0x01 opGT
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x01]);
    });
    it('should gt false', function() {
      const program = [0x01, 0x02, 0x26]; // 0x01 0x02 opGT
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      vm.step(program);
      vm.step(program);
      vm.step(program);
      assert.deepEqual(vm.contract.stack, [0x00]);
    });
  });

});
