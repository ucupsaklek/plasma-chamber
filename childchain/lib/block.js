const MerkleTree = require("merkletree").default;


class Block {
  
  constructor() {
    this.id = null;
    this.number = 0;
    this.hash = null;
    this.prevhash = null;
    this.txs_root = null;
    this.txs = [];
    this.timestamp = null;
    this.nonce = null;
    this.gaslimit = 0;
    this.gasused = 0;
  }

  appendTx(tx) {
    this.txs.push(tx);
  }

  createTxProof(tx) {
    const tree = MerkleTree(this.txs.map(tx=>tx.hash()));
    return tree.proof(tx.hash());
  }

  merkleHash() {
    const tree = MerkleTree(this.txs.map(tx=>tx.hash()));
    return tree.root();
  }

}

module.exports = Block
