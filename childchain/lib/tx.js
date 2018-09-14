const RLP = require('rlp');
const crypto = require('crypto');


class Transaction {
  
  constructor() {
    this.id = null;
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
    this.gaslimit = 0;
    this.gasused = 0;
  }

  hash() {
    const data = [this.id, this.inputs, this.outputs];
    const hash = crypto.createHash('sha256');
    hash.update(RLP.encode(data));
    return hash.digest();
  }

}

module.exports = Transaction
