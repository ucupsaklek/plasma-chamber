const assert = require('assert');
const ChainManager = require('../lib/chain_manager');
const chainManager = new ChainManager();
const Block = require('../lib/block');
const { Transaction } = require('../lib/tx');
const levelup = require('levelup');
const memdown = require('memdown');

describe('ChainManager', function() {

  describe('start', function() {

    const memdownBlockDb = memdown();
    const memdownMetaDb = memdown();
    const memdownSnapshotDb = memdown();

    before(done=>{
      const blockDB = levelup(memdownBlockDb);
      const metaDB = levelup(memdownMetaDb);
      const snapshotDB = levelup(memdownSnapshotDb);
      metaDB.put("blockHeight", "1")
        .then(_=> blockDB.put(1, JSON.stringify(new Block(1))) )
        .then(_=> metaDB.put("commitmentTxs", JSON.stringify([new Transaction(0)])) )
        .then(_=>{
          blockDB.close(_=>{
            metaDB.close(_=>{
              snapshotDB.close(done);
            });
          });
        })
    })

    it('should have properties', function(done) {
      chainManager.start({
        blockdb: memdownBlockDb,
        metadb: memdownMetaDb,
        snapshotdb: memdownSnapshotDb
      }).then(async chain=>{
        assert(chain.id.length > 0);
        assert(chain.blockHeight == 0);
        assert(chain.commitmentTxs.length >= 0);
        await chainManager.stop();
        done();
      })
    }).timeout(2000);

  });
  
});
