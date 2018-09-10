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


});
