const assert = require('assert');
const ChainManager = require('../lib/chain_manager');
const chainManager = new ChainManager();


describe('ChainManager', function() {
  describe('start', function() {
    it('should have properties', function(done) {
      chainManager.start().then(chain=>{
        assert(chain.id.length > 0);
        assert(chain.blockHeight > 0);
        assert(chain.block.number > 0);
        assert(chain.commitmentTxs.length >= 0);
        chainManager.stop();
        done();
      })
    }).timeout(2000);
  });
});
