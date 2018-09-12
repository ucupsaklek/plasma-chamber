const assert = require('assert');
const Api = require('../lib/api');

describe('Api', function() {
  describe('ApiTx()', function() {
    it('should return', function(done) {
      const prog = new Buffer('60436b636f6e747261637473656564692e663e012a2d003b404460537f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268025460560a7fd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d65616e63686f720454055446432d2d0032012a2e7f11111111111111111111111111111111111111111111111111111111111111112e702d512d012a692e663e012a2d003b40444748433f9f85b6dd0de0f66f2aee94de9f184568e093d3a056a814fe08231d57d1505383bdae33d697be1c9c6bf7d4bec9cc27afff50f53de765155482b046d62a41e8290b2e43', 'hex');
      Api.apiTx(prog).then((vm) => {
        assert.equal(vm.finalized, true);
        done()
      })
    });
  });
});