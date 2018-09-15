const RLP = require('rlp');
const crypto = require('crypto');


class Transaction {
  
  constructor(id) {
    this.id = id;
    this.finalized = false;
    this.contracts = [];
    this.timerange = [];
    this.nonces = [];
    // 32 bytes
    this.anchor = null;
    this.inputs = [];
    // deposit amount never change
    // this.issueances = [];
    this.outputs = [];
    // deposit amount never change
    // this.retirements = [];
  }

  getBytes() {
    const data = [this.id].concat(this.inputs).concat(this.outputs);
    return RLP.encode(data);
  }

  hash() {
    const hash = crypto.createHash('sha256');
    hash.update(this.getBytes());
    return hash.digest('hex');
  }

}

module.exports = Transaction
