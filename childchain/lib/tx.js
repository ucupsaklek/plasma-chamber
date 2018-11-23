const RLP = require('rlp');
const utils = require('ethereumjs-util');
const BigNumber = require('bignumber.js');
const {
  CHUNK_SIZE
} = require('./constant');

class BufferUtils {
  static bufferToNum(buf) {
    if(buf.length == 0) return 0;
    return new BigNumber('0x' + buf.toString('hex')).toNumber();
  }
  static bufferToBignum(buf) {
    if(buf.length == 0) return 0;
    return new BigNumber('0x' + buf.toString('hex'));
  }
  static hexToBuffer(hex) {
    return Buffer.from(hex.substr(2), 'hex');
  }
  static numToBuffer(n) {
    let str = new BigNumber(n).toString(16);
    if(str.length % 2 === 1) str = '0' + str;
    return Buffer.from(str, 'hex');
  }
}

class TransactionOutput {

  /**
   * 
   * @param {Array[string]} owners 
   * @param {Array[number]} value 
   * @param {Array[Buffer]} state first item is number
   * @param {number} blkNum 
   */
  constructor(owners, value, state, blkNum) {
    // addresses, tx need their signatures
    this.owners = owners || [];
    this.owners = this.owners.map(owner => {
      if(owner instanceof Buffer) {
        return utils.toChecksumAddress(utils.bufferToHex(owner));
      }else if(utils.isValidAddress(owner)) {
        return owner;
      }else{
        throw new Error('invalid address');
      }
    })
    // values are uid list
    this.value = value.map(v => {
      return {
        start: (typeof v.start === 'number') ? new BigNumber(v.start) : v.start,
        end: (typeof v.end === 'number') ? new BigNumber(v.end) : v.end
      }
    })
    // contract address include verification function, 20byte
    // this.contract = 0;
    // state in bytes
    this.state = state || [];
    // block number
    this.blkNum = blkNum;
  }

  /**
   * @dev get list of items
   */
  getTuple(_blkNum) {
    const blkNum = _blkNum || this.blkNum;
    if(blkNum !== undefined) {
      return [
        this.owners.map(BufferUtils.hexToBuffer),
        this.value.map(mapValue),
        this.state,
        blkNum
      ]
    }else{
      return [
        this.owners.map(BufferUtils.hexToBuffer),
        this.value.map(mapValue),
        this.state
      ]
    }
    function mapValue(v) {
      return [toBuf(v.start), toBuf(v.end)];
    }
    function toBuf(n) {
      if(typeof n == 'number') {
        return n;
      }else{
        let s = n.toString(16);
        if(s.length % 2 == 1) s = '0' + s;
        return Buffer.from(s, 'hex');
      }
    }
  }

  /**
   * @dev serialize to Buffer
   */
  getBytes(blkNum) {
    return RLP.encode(this.getTuple(blkNum));
  }

  /**
   * @dev deserialize from Buffer
   * @param {Array} decoded RLP Array
   */
  static fromTuple(decoded) {
    return new TransactionOutput(
      // owners
      decoded[0],
      // value
      decoded[1].map(v => {
        return {
          start: BufferUtils.bufferToBignum(v[0]),
          end: BufferUtils.bufferToBignum(v[1])
        }
      }),
      // state
      [BufferUtils.bufferToNum(decoded[2][0])].concat(decoded[2].slice(1)),
      // blkNum
      decoded[3] ? BufferUtils.bufferToNum(decoded[3]) : undefined
    );
  }
  
  static fromBytes(data) {
    return TransactionOutput.fromTuple(RLP.decode(data));
  }

  toJson() {
    return {
      owners: this.owners,
      value: this.value.map(v => {
        return {
          start: v.start.toString(),
          end: v.end.toString()
        }
      }),
      state: this.state,
      blkNum: this.blkNum
    }
  }

  /**
   * @dev get hash of TransactionOutput
   */
  hash(blkNum) {
    return utils.sha3(this.getBytes(blkNum));
  }

  clone() {
    return new TransactionOutput(
      [].concat(this.owners),
      [].concat(this.value),
      [].concat(this.state),
    )
  }

  static empty() {
    return new TransactionOutput(
      [], // owners
      [],
      []
    )
  }

  getStartSlot(index) {
    return TransactionOutput.amountToSlot(this.value[index].start);
  }

  static amountToSlot(index) {
    return index.div(CHUNK_SIZE).integerValue(BigNumber.ROUND_FLOOR).toNumber();
  }

}

class Transaction {

  /**
   * 
   * @param {number} label 
   * @param {Array[Buffer]} args 
   * @param {number} nonce 
   * @param {Array[TransactionOutput]} inputs 
   * @param {Array[TransactionOutput]} outputs 
   */
  constructor(label, args, nonce, inputs, outputs) {
    // label must be number
    if(typeof label != 'number') throw new Error('invalid label at Transaction.constructor');
    this.label = label;
    // args must be Buffers
    this.args = args || []
    this.args.forEach(arg => {
      if(!(arg instanceof Buffer)) {
        throw new Error('invalid args at Transaction.constructor');
      }
    });
    // inputs UTXO
    this.inputs = inputs || [];
    // outputs UTXO
    this.outputs = outputs || [];
    // hash of tx, 32byte
    this.nonce = nonce;
    // signatures
    this.sigs = [];
  }

  /**
   * @dev serialize to buffer
   * @param {boolean} includeSigs 
   */
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

  /**
   * @dev deserialize from buffer
   * @param {Buffer} data
   */
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

  /**
   * @dev sign transaction hash
   * @param {Buffer} privKey
   */
  sign(privKey) {
    const sign = utils.ecsign(Buffer.from(this.hash(), 'hex'), privKey);
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

  getSigns() {
    return this.sigs;
  }

  checkSigns() {
    const owners = this.getOwners();
    if(this.sigs.length != owners.length) {
      throw new Error('signatures not enough');
    }
    const unmatchSigs = this.sigs.filter((sig, i) => {
      var pubKey = utils.ecrecover(
        Buffer.from(this.hash(), 'hex'),
        sig.slice(64, 65).readUInt8(0),
        sig.slice(0, 32),
        sig.slice(32, 64)
      );
      return utils.bufferToHex(utils.pubToAddress(pubKey)) === owners[i];
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
    const buf = Buffer.concat([Buffer.from(txHash, 'hex')].concat(this.sigs));
    return utils.sha3(buf);
  }

  hash() {
    return utils.sha3(this.getBytes());
  }

  toJson() {
    return {
      label: this.label,
      args: this.args.map(buf => buf.toString('hex')),
      inputs: this.inputs.map(i => i.toJson()),
      outputs: this.outputs.map(o => o.toJson()),
      nonce: this.nonce,
      sigs: this.sigs.map(buf => buf.toString('hex'))
    }
  }

}

module.exports = {
  BufferUtils,
  Transaction,
  TransactionOutput
}
