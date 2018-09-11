const assert = require('assert');
const { Assembler, assembleSource, assembleScanner } = require('../lib/asm/asm');

describe('VirtualMachine', function() {

  describe('Assemble', function() {
    it('should assemble send contract', function() {
      // transfer
      var sendContract = "{'C', 'contractseed',[put [txid 1 roll get 0 checksig verify] yield]," +
      "{'S', x'30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268'}," +
      "{'V', 10, x'd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d', 'anchor'}" +
      "} input call\n" +
      "get get\n" +
      "0 split 1 roll\n" +
      "put\n" +
      "x'1111111111111111111111111111111111111111111111111111111111111111' put\n" +
      "[get dup get 1 roll" + // set pubkey for exitor and reciever
      " [put [txid 1 roll get 0 checksig verify] yield] output\n" +
      "] contract call\n" +
      "finalize" +
      "\n";
      const buf = assembleSource(sendContract);
      assert.deepEqual(buf.toString('hex'),  '60436b636f6e747261637473656564692e663e012a2d003b404460537f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268025460560a7fd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d65616e63686f720454055446432d2d0032012a2e7f11111111111111111111111111111111111111111111111111111111111111112e702d512d012a692e663e012a2d003b40444748433f');
    });
  });

});
