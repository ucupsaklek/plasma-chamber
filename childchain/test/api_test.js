const assert = require('assert');
const Api = require('../lib/api');

describe('Api', function() {
  describe('ApiTx()', function() {
    it('should return', function(done) {
      Api.apiTx([0x60, 0x01, 0x2e, 0x2d, 0x52, 0x3f]).then((vm) => {
        assert.equal(vm.finalized, true);
        done()
      })
    });
  });
});