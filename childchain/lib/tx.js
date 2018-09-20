const RLP = require('rlp');
const crypto = require('crypto');
const utils = require('ethereumjs-util');

class Asset {
  constructor(assetId, amount) {
    this.assetId = assetId;
    this.amount = amount;
  }

  getTuple() {
    return [this.assetId, this.amount];
  }

  getBytes() {
    return RLP.encode(this.getTuple());
  }

}

class TransactionOutput {
  constructor(owners, value) {
    // addresses, tx need their signatures
    this.owners = owners || [];
    // values
    this.value = value;
    // contract address include verification function, 20byte
    this.contract = 0;
    // state in bytes
    this.state = []
  }

  getTuple() {
    return [
      this.owners,
      this.value.getTuple(),
      this.contract,
      this.state
    ]
  }

  getBytes() {
    return RLP.encode(this.getTuple());
  }

  hash() {
    const hash = crypto.createHash('sha256');
    hash.update(this.getBytes());
    return hash.digest('hex');
  }

}

class Transaction {
  
  constructor(label, args, nonce, inputs, outputs) {
    // arguments for tx, first argument is function label
    this.label = label;
    this.args = args || []
    // inputs UTXO
    this.inputs = inputs || [];
    // outputs UTXO
    this.outputs = outputs || [];
    // hash of tx, 32byte
    this.nonce = nonce;
    this.id = this.hash();
  }

  getBytes() {
    const data = [
      this.contract,
      this.label,
      this.args,
      this.inputs.map(i => i.getTuple()),
      this.outputs.map(o => o.getTuple()),
      this.nonce
    ];
    return RLP.encode(data);
  }

  sign(privKey) {
    this.sign = utils.ecsign(new Buffer(this.hash(), 'hex'), privKey);
    this.sign = Buffer.concat([this.sign.r, this.sign.s, Buffer.from([this.sign.v])], 65);
    return this.sign;
  }

  hash() {
    const hash = crypto.createHash('sha256');
    hash.update(this.getBytes());
    return hash.digest('hex');
  }

}

module.exports = {
  Asset,
  Transaction,
  TransactionOutput
}
