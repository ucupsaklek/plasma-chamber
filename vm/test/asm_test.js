const assert = require('assert');
const { Assembler, assembleSource, assembleScanner } = require('../lib/asm/asm');

describe('VirtualMachine', function() {

  describe('Assemble', function() {
    it('should assemble send contract', function() {
      // transfer
      var sendContract = "{'C', 'contractseed', x'30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268', {x'00', 10}, [put [txid 1 roll get 0 checksig verify] yield]," +
      "{'S', x'30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268'}," +
      "{'V', 10, x'd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d', 'anchor'}" +
      "} input call\n" +
      "get get\n" +
      "0 split swap\n" +
      "put\n" +
      "x'1111111111111111111111111111111111111111111111111111111111111111' put\n" +
      "[get dup get swap" + // set pubkey for exitor and reciever
      " [put [txid swap get 0 checksig verify] yield] output\n" +
      "] contract call\n" +
      "finalize" +
      "\n";
      const buf = assembleSource(sendContract);
      assert.deepEqual(buf.toString('hex'),  '60436b636f6e7472616374736565647f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df626860000a0254692e663e012a2d003b404460537f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268025460560a7fd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d65616e63686f720454075446432d2d0032012a2e7f11111111111111111111111111111111111111111111111111111111111111112e702d512d012a692e663e012a2d003b40444748433f');
    });
  });

  describe('Macro', function() {
    it('should assemble macro bool', function() {
      const buf = assembleSource("bool");
      assert.deepEqual(buf.toString('hex'), '2727'); // not(27) not(27)
    });
    it('should assemble macro swap', function() {
      const buf = assembleSource("swap");
      assert.deepEqual(buf.toString('hex'), '012a'); // 01 roll(2a)
    });
    it('should assemble macro jump', function() {
      const buf = assembleSource("jump");
      assert.deepEqual(buf.toString('hex'), '01012a41'); // 01 01 roll(2a) jumpif(41)
    });
    it('should assemble macro sub', function() {
      const buf = assembleSource("sub");
      assert.deepEqual(buf.toString('hex'), '2221'); // neg(22) add(21)
    });
    it('should assemble macro splitzero', function() {
      const buf = assembleSource("splitzero");
      assert.deepEqual(buf.toString('hex'), '0032'); // 00 split(32)
    });
  });

});
