const SparseMerkleTree = require('./smt');
const {
  Transaction
} = require('./tx');

const SMT_DEPTH = 16;

/*
* Only concerns for latest raw Block
* Older generated blocks are basically on leveldb
*/
class Block {
  
  constructor(number, isDepositBlock) {
    this.id = null;
    this.number = number;
    this.hash = null;
    this.prevhash = null;
    this.txs_root = null;
    this.isDepositBlock = isDepositBlock || false;
    this.txs = [];
    this.timestamp = Date.now();
    this.nonce = null;
    this.gaslimit = 0;
    this.gasused = 0;
    this.tree = null;
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

  createTree() {
    if(this.tree !== null) return this.tree;
    let leaves = Array.from(Array(Math.pow(2, SMT_DEPTH)), (item, index) => null);
    this.txs.forEach(tx=>{
      tx.outputs.forEach((o) => {
        o.value.forEach((uid) => {
          leaves[uid] = tx.hash();
        })
      })
    })
    this.tree = new SparseMerkleTree(SMT_DEPTH, leaves);
    return this.tree;
  }

  createCoinProof(uid) {
    const tree = this.createTree();
    return tree.proof(uid);
  }

  createTXOProof(txo) {
    const tree = this.createTree();
    return txo.value.map((uid) => tree.proof(uid)).reduce((acc, p) => {
      return Buffer.concat(acc.concat([p]))
    }, []);
  }

  createTxProof(txo) {
    const uids = txo.outputs.reduce((uids, o) => {
      return uids.concat(o.value);
    }, []);
    const tree = this.createTree();
    return uids.map((uid) => tree.proof(uid)).reduce((acc, p) => {
      return Buffer.concat(acc.concat([p]))
    }, []);
  }

  merkleHash() {
    const tree = this.createTree();
    return tree.root();
  }

  /**
   * @dev serialize to string
   */
  toString() {
    return JSON.stringify({
      id: this.id,
      number: this.number,
      hash: this.hash,
      prevhash: this.prevhash,
      txs_root: this.txs_root,
      txs: this.txs.map(tx => {
        return tx.getBytes(true).toString('hex')
      }),
      timestamp: this.timestamp,
      nonce: this.nonce,
      gaslimit: this.gaslimit,
      gasused: this.gasused,
      isDepositBlock: this.isDepositBlock
    })
  }

  /**
   * @dev deserialize from string
   */
  static fromString(str) {
    const block = JSON.parse(str);
    const empty = new Block(block.number, block.isDepositBlock);
    empty.id = block.id;
    empty.number = block.number;
    empty.hash = block.hash;
    empty.txs = block.txs ? block.txs.map(tx => {
      return Transaction.fromBytes(new Buffer(tx, 'hex'))
    }) : [];
    return empty;
  }

}

module.exports = Block
