const MerkleTree = require('./merkle');

/*
* Only concerns for latest raw Block
* Older generated blocks are basically on leveldb
*/
class Block {
  
  constructor(number) {
    this.id = null;
    this.number = number;
    this.hash = null;
    this.prevhash = null;
    this.txs_root = null;
    this.txs = [];
    this.timestamp = Date.now();
    this.nonce = null;
    this.gaslimit = 0;
    this.gasused = 0;
  }

  appendTx(tx) {
    this.txs.push(tx);
  }

  getTxIndex(tx) {
    for(var i = 0;i < this.txs.length;i++) {
      if(Buffer.compare(this.txs[i].hash(), tx.hash()) == 0) {
        return i;
      }
    }
    return -1;
  }

  createTxProof(tx) {
    const tree = new MerkleTree(this.txs.map(tx=>tx.merkleHash()));
    return tree.proof(tx.merkleHash());
  }

  merkleHash() {
    const tree = new MerkleTree(this.txs.map(tx=>tx.merkleHash()));
    return tree.root();
  }

  toString() {
    return JSON.stringify({
      id: this.id,
      number: this.number,
      hash: this.hash,
      prevhash: this.prevhash,
      txs_root: this.txs_root,
      txs: this.txs,
      timestamp: this.timestamp,
      nonce: this.nonce,
      gaslimit: this.gaslimit,
      gasused: this.gasused
    })
  }

}

module.exports = Block
