const Block = require('./block');

class Chain {
  
  constructor() {
    this.id = null;
    this.blocks = [];
    this.commitmentTxs = []
  }

  generateBlock() {
    const lastBlock = this.blocks[this.blocks.length - 1];
    const newBlock = new Block(lastBlock);
    const txs = this.commitmentTxs
    txs.filter((tx) => {
      if(Snapshot.applyTx(tx)) {
        return true;
      }else{
        return false
      }
    }).forEach((txs) => {
      newBlock.appendTx(tx);
    });
    this.blocks.push(newBlock);
  }

}

module.exports = Chain
