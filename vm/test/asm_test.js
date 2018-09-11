const assert = require('assert');
const { Assembler, assembleSource, assembleScanner } = require('../lib/asm/asm');

describe('VirtualMachine', function() {

  describe('Assemble', function() {
    it('should assemble send contract', function() {
      // transfer
      var sendContract = "{'C', 'contractseed',[put [txid 1 roll get 0 checksig verify] yield]," +
      "{'S', x'4a771e03af3f5705ec280ac8761d568776fb2b650da9067d3f3ef7010b588d41'}," +
      "{'V', 10, x'd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d', 'anchor'}" +
      "} input call";
      const buf = assembleSource(sendContract);
      assert.deepEqual(buf.toString('hex'),  '60436b636f6e747261637473656564692e663e012a2d003b404460537f4a771e03af3f5705ec280ac8761d568776fb2b650da9067d3f3ef7010b588d41025460560a7fd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d65616e63686f72045405544643');
    });
  });

});
