const Chain = require("./chain");
const {
  Block
} = require('@cryptoeconomicslab/chamber-core');
const Snapshot = require("./state/snapshot")
const levelup = require('levelup');

class ChainManager {
  constructor(){
    this.chain = null;
    this.timer = null;
  }
  async start (options){
    const blockTime = options.blockTime || 10000;
    const blockDB = levelup(options.blockdb);
    const metaDB = levelup(options.metadb);
    const snapshotDB = levelup(options.snapshotdb);
    const childChain = new Chain();
    childChain.setMetaDB(metaDB);
    childChain.setBlockDB(blockDB);

    //DEBUG for making initial DB
    // childChain.blockHeight = 20;
    // await childChain.generateBlock()

    const snapshot = new Snapshot();
    snapshot.setDB(snapshotDB);
    childChain.setSnapshot(snapshot);
    await childChain.setChainID("NKJ23H3213WHKHSAL");
    await childChain.resume();
    this.chain = childChain;
    const generateBlock = async () => {
      await this.chain.generateBlock();
      this.timer = setTimeout(generateBlock, blockTime);
    }
    if(blockTime > 0) {
      this.timer = setTimeout(generateBlock, blockTime);
    }
    return childChain;
  }
  async stop(){
    if(this.timer) {
      clearTimeout(this.timer);
    }
    await this.chain.gracefulStop();
  }

}

module.exports = ChainManager
