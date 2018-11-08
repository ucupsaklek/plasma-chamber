const RLP = require('rlp');
const utils = require('ethereumjs-util');
const BigNumber = require('bignumber.js');

class BufferUtils {
  static bufferToNum(buf) {
    if(buf.length == 0) return 0;
    return new BigNumber('0x' + buf.toString('hex')).toNumber();
  }
}
class TransactionOutput {
  constructor(owners, value, state, blkNum) {
    // addresses, tx need their signatures
    this.owners = owners || [];
    // values are uid list
    this.value = value;
    // contract address include verification function, 20byte
    this.contract = 0;
    // state in bytes
    this.state = state || [];
    // block number
    this.blkNum = blkNum;
  }

  getTuple() {
    if(this.blkNum != undefined) {
      return [
        this.owners,
        this.value,
        this.state,
        this.blkNum
      ]
    }else{
      return [
        this.owners,
        this.value,
        this.state
      ]

    }
  }

  getBytes() {
    return RLP.encode(this.getTuple());
  }

  static fromTuple(decoded) {
    return new TransactionOutput(
      // owners
      decoded[0],
      // value
      decoded[1].map(v => {
        return BufferUtils.bufferToNum(v);
      }),
      // state
      [BufferUtils.bufferToNum(decoded[2][0])].concat(decoded[2].slice(1)),
      // blkNum
      decoded[3] ? BufferUtils.bufferToNum(decoded[3]) : undefined
    );
  }

  hash() {
    return utils.sha3(this.getBytes());
  }

  clone() {
    return new TransactionOutput(
      [].concat(this.owners),
      [].concat(this.value),
      [].concat(this.state),
      this.blkNum
    )
  }

  static empty() {
    return new TransactionOutput(
      [], // owners
      [],
      []
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
      BufferUtils.bufferToNum(decoded[1]),
      decoded[2],
      BufferUtils.bufferToNum(decoded[5]),
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

  getOutput(uid) {
    return this.outputs.filter((o) => {
      return (o.value.indexOf(uid) >= 0)
    })[0];
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
  Transaction,
  TransactionOutput
}
