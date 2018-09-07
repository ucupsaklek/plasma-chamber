const assert = require('assert');
const Api = require('../lib/api');

describe('Api', function() {
  describe('ApiTx()', function() {
    it('should return', function(done) {
      Api.apiTx("aa").then((r) => {
        assert.equal(r, "aa");
        done()
      })
    });
  });
});