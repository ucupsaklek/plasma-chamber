const MerkleTree = require("merkletree").default;

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

  createTxProof(tx) {
    const tree = MerkleTree(this.txs.map(tx=>tx.hash()));
    return tree.proof(tx.hash()).reduce((acc, p) => {return acc + p.parent}, '');
  }

  merkleHash() {
    const tree = MerkleTree(this.txs.map(tx=>tx.hash()));
    return tree.root();
  }

}

module.exports = Block
