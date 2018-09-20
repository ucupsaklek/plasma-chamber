const RLP = require('rlp');
const crypto = require('crypto');
const ed25519 = require('ed25519')

class Asset {
  constructor() {
    this.amount = 0;
    this.assetId = 0;
    this.anchor = 0;
  }

  getBytes() {
    return RLP.encode([this.assetId, this.amount, this.anchor]);
  }

}

class TransactionOutput {
  constructor() {
    // addresses, tx need their signatures
    this.owners = [];
    // values
    this.values = [];
    // contract address include verification function, 20byte
    this.contract = 0;
    // state in bytes
    this.state = []
  }

  getBytes() {
    return RLP.encode([
      this.owners,
      this.values.map(v => v.getBytes()),
      this.contract,
      this.state
    ]);
  }

  hash() {
    const hash = crypto.createHash('sha256');
    hash.update(this.getBytes());
    return hash.digest('hex');
  }

}

class Transaction {
  
  constructor(id) {
    // hash of tx, 32byte
    this.id = id;
    // arguments for tx, first argument is function label
    this.label = 
    this.args = []
    // inputs UTXO
    this.inputs = [];
    // outputs UTXO
    this.outputs = [];
  }

  getBytes() {
    const data = [
      this.id,
      this.contract,
      this.args,
      this.inputs.map(i => i.hash()),
      this.outputs.map(o => o.hash())
    ];
    return RLP.encode(data);
  }

  sign(privKey) {
    this.sign = ed25519.Sign(new Buffer(this.hash(), 'hex'), privKey);
    return this.sign;
  }

  hash() {
    const hash = crypto.createHash('sha256');
    hash.update(this.getBytes());
    return hash.digest('hex');
  }

}

module.exports = Transaction
