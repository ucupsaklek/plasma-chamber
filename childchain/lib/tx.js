const RLP = require('rlp');
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

  static fromTuple(decoded) {
    return new Asset(decoded[0], decoded[1]);
  }

  clone() {
    return new Asset(this.assetId, this.amount);
  }

}

const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');

class TransactionOutput {
  constructor(owners, value, state, blkNum, txIndex, oIndex) {
    // addresses, tx need their signatures
    this.owners = owners || [];
    // values
    this.value = value;
    // contract address include verification function, 20byte
    this.contract = 0;
    // state in bytes
    this.state = state || [];
    // block number
    this.blkNum = blkNum;
    // transaction index
    this.txIndex = txIndex;
    // outputs index
    this.oIndex = oIndex;
  }

  getTuple() {
    if(this.blkNum != undefined && this.txIndex != undefined && this.oIndex != undefined) {
      return [
        this.owners,
        this.value.getTuple(),
        this.contract,
        this.state,
        this.blkNum,
        this.txIndex,
        this.oIndex
      ]
    }else{
      return [
        this.owners,
        this.value.getTuple(),
        this.contract,
        this.state
      ]

    }
  }

  getBytes() {
    return RLP.encode(this.getTuple());
  }

  static fromTuple(decoded) {
    return new TransactionOutput(
      decoded[0],
      Asset.fromTuple(decoded[1]),
      decoded[3],
      decoded[4], // blkNum
      decoded[5], // txIndex
      decoded[6]  // oIndex
    );
  }

  hash() {
    return utils.sha3(this.getBytes());
  }

  clone() {
    return new TransactionOutput(
      [].concat(this.owners),
      this.value.clone(),
      [].concat(this.state),
      this.blkNum,
      this.txIndex,
      this.oIndex
    )
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
    // signatures
    this.sigs = [];
  }

  getBytes(includeSigs) {
    let data = [
      0,
      this.label,
      this.args,
      this.inputs.map(i => i.getTuple()),
      this.outputs.map(o => o.getTuple()),
      this.nonce
    ];
    if(includeSigs) {
      data.push(this.sigs);
    }
    return RLP.encode(data);
  }

  static fromBytes(data) {
    const decoded = RLP.decode(data);
    const tx = new Transaction(
      decoded[1],
      decoded[2],
      decoded[5],
      decoded[3].map(d => TransactionOutput.fromTuple(d)),
      decoded[4].map(d => TransactionOutput.fromTuple(d)),
    );
    tx.sigs = decoded[6] || [];
    return tx;
  }

  sign(privKey) {
    const sign = utils.ecsign(new Buffer(this.hash(), 'hex'), privKey);
    const signBuffer = Buffer.concat([sign.r, sign.s, Buffer.from([sign.v])], 65);
    return signBuffer;
  }

  getOwners() {
    return this.inputs.reduce((owners, i) => {
      return owners.concat(i.owners);
    }, []);
  }

  checkSigns() {
    const owners = this.getOwners();
    if(this.sigs.length != owners.length) {
      throw new Error('signatures not enough');
    }
    const unmatchSigs = this.sigs.filter((sig, i) => {
      var pubKey = utils.ecrecover(
        new Buffer(this.hash(), 'hex'),
        sig.slice(64, 65).readUInt8(0),
        sig.slice(0, 32),
        sig.slice(32, 64)
      );
      return Buffer.compare(utils.pubToAddress(pubKey), owners[i]) != 0;
    });
    if(unmatchSigs != 0) {
      throw new Error('signatures not match');
    }
  }

  /**
   * @dev merkleHash is hash(hash(tx) + sigs).
   * sigs are signatures of all inputs owners.
   */
  merkleHash() {
    this.checkSigns();
    const txHash = this.hash();
    const buf = Buffer.concat([new Buffer(txHash, 'hex')].concat(this.sigs));
    return utils.sha3(buf);
  }

  hash() {
    return utils.sha3(this.getBytes());
  }

}

module.exports = {
  Asset,
  Transaction,
  TransactionOutput
}
