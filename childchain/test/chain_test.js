const assert = require('assert');
const Chain = require('../lib/chain');

describe('Chain', function() {
  describe('applyDeposit()', function() {
    it('should apply deposit', function() {
      const chain = new Chain();
      chain.applyDeposit({
        returnValues: {
          depositor: 'e0d7a297a4f17f4122af3088a20374493c897cbd8689c870fca6fb71aa3db8c1',
          amount: 20
        }
      })
      assert.equal(chain.blocks.length, 1);
    });
  });
});