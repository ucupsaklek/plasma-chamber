const assert = require('assert');
const Api = require('../lib/api');

describe('Api', function() {
  describe('ApiTx()', function() {
    it('should return', function(done) {
      const prog = new Buffer('60436b636f6e7472616374736565647f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df626860000a0254692e663e012a2d003b404460537f30af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268025460560a7fd073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d65616e63686f720454075446432d2d0032012a2e7f11111111111111111111111111111111111111111111111111111111111111112e702d512d012a692e663e012a2d003b40444748433f9f3526cd0e8e21c58dc22ac2a3540002c6cfc1ac4afc477e6a4729bf52e6c4c002cd089124bffe3b196548cda9ed113803bbbcfe78e04be94d88cb621548c1b7092e43', 'hex');
      Api.apiTx(prog).then((vm) => {
        assert.equal(vm.finalized, true);
        done()
      })
    });
  });
});