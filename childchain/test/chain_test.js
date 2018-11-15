const assert = require('assert');
const ChainManager = require('../lib/chain_manager');
const chainManager = new ChainManager();
const Listener = require('../../listener/lib/index')
const memdown = require('memdown');
const BigNumber = require('bignumber.js');

describe('Chain', function() {

  const depositor = '0x627306090abab3a6e1400e9345bc60c78a8bef57';
  const uid = new BigNumber(0x123);

  describe('applyDeposit()', function() {
    it('should apply deposit', function(done) {
      chainManager.start({
        blockdb: memdown(),
        metadb: memdown(),
        snapshotdb: memdown()
      }).then(chain=>{
        const initialBlockHeight = chain.blockHeight;

        chain.applyDeposit({
          returnValues: {
            depositor: depositor,
            start: 0,
            end: 2
          }
        })
  
        setTimeout(_=>{
          assert(initialBlockHeight + 1 === chain.blockHeight);
          chainManager.stop();
          done();
        }, 1500)
      })
    }).timeout(2000);
  });

  describe('getBlock()', function() {
    it('should getBlock', function(done) {
      chainManager.start({
        blockdb: memdown(),
        metadb: memdown(),
        snapshotdb: memdown()
      }).then(chain=>{
        chain.applyDeposit({
          returnValues: {
            depositor: depositor,
            start: 0,
            end: 2
          }
        }).then(() => {
          return chain.getBlock(chain.blockHeight);
        }).then(block => {
          assert(block.number === chain.blockHeight);
          assert(block.txs.length === 1);
          chainManager.stop();
          done();
        }).catch(e => {
          console.error(e)
        })
      })
    }).timeout(2000);
  });

});
