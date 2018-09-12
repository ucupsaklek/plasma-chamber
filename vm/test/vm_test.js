const assert = require('assert');
const VirtualMachine = require('../lib/vm');
const ed25519 = require('ed25519')
const crypto = require('crypto')

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
  describe('send', function() {
    it('should', function() {
      /*
      const seed = crypto.randomBytes(32);
      const keyPair = ed25519.MakeKeypair(seed);
      console.log(keyPair.publicKey.toString('hex'));
      console.log(keyPair.privateKey.toString('hex'));
      */
      const privKey = new Buffer('2bb2ecd1537480b7ecab8b847785025f97ecbe2564489e80217a34339f0ee4b230af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268', 'hex')
      const program = new Buffer('60436b636f6e747261637473656564692e663e012a2d003b404460537f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268025460560a7fd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d65616e63686f720454055446432d2d0032012a2e7f11111111111111111111111111111111111111111111111111111111111111112e702d512d012a692e663e012a2d003b40444748433f', 'hex');
      const vm = VirtualMachine.createVM(program);
      vm.run.prog = program;
      try {
        vm.validate(program);
      }catch(e) {

      }
      const txidSig = ed25519.Sign(new Buffer(vm.txid, 'hex'), privKey);
      const program2 = Buffer.concat([program, new Buffer('9f', 'hex'), txidSig, new Buffer('2e43', 'hex')]);
      const vm2 = VirtualMachine.createVM(program2);
      vm2.run.prog = program2;
      vm2.validate(program2);
      console.log(vm2.log);
      assert.deepEqual(vm2.contract.stack, []);
    });
  });

});
