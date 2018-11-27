const utils = require('ethereumjs-util')
const RLP = require('rlp')

const Block = require('../lib/block')
const {
  TransactionOutput
} = require('../lib/tx')

const {
  CHUNK_SIZE
} = require('./constant')

class StorageInterface {

  static store(key, item) {
  }

  static load(key) {
  }

}

class BigStorageInterface {

  constructor() {
    this.data = {}
  }

  add(utxoKey, blkNum, proof, txBytes, index) {
    if(!this.data[utxoKey]) {
      this.data[utxoKey] = {};
    }
    this.data[utxoKey][blkNum] = {
      utxoKey,
      blkNum,
      proof,
      txBytes,
      index
    }
  }

  async get(utxoKey, blkNum) {
    return this.data[utxoKey][blkNum]
  }

  async lastTransactions(utxoKey) {

  }

  async searchProof(utxoKey) {

  }

}

class BaseWallet {
  constructor(_options) {
    this.address = null
    this.utxos = {}
    const options = _options || {}
    this.storage = options.storage || StorageInterface
    this.bigStorage = options.bigStorage || new BigStorageInterface()
  }

  setAddress(address) {
    // address is hex string and checksum address
    this.address = address
  }

  filterOwner(o) {
    const r = o.owners.map(ownerAddress => {
      return utils.toChecksumAddress(ownerAddress)
    })
    return r.indexOf(this.address) >= 0
  }

  updateBlock(block) {
    const transactions = block.txs
    transactions.reduce((acc, tx) => {
      return acc.concat(tx.inputs)
    }, []).filter(this.filterOwner.bind(this)).forEach((spentUTXO) => {
      const key = spentUTXO.hash().toString('hex')
      console.log('delete', spentUTXO.blkNum, block.number, spentUTXO.value)
      delete this.utxos[key]
    });
    let newTx = {}
    transactions.forEach(tx => {
      tx.outputs.forEach((utxo, i) => {
        if(this.filterOwner(utxo)) {
          const key = utxo.hash(block.number).toString('hex')
          this.utxos[key] = utxo.getBytes(block.number).toString('hex')
          newTx[key] = {
            txBytes: tx.getBytes(true).toString('hex'),
            index: i
          };
          console.log('insert', block.number, utxo.value, i)
        }
      })
    })
    let chunks = []
    transactions.forEach(tx => {
      tx.outputs.forEach((utxo, oIndex) => {
        utxo.value.forEach(({start, end}, i) => {
          const slot = TransactionOutput.amountToSlot(CHUNK_SIZE, start)
          chunks[slot] = {
            txBytes: tx.getBytes(true).toString('hex'),
            index: oIndex,
            output: utxo
          }
        })
      })
    })
    // getting proof
    Object.keys(this.utxos).forEach(key => {
      TransactionOutput.fromBytes(Buffer.from(this.utxos[key], 'hex')).value.map(({start, end}) => {
        const slot = TransactionOutput.amountToSlot(CHUNK_SIZE, start)
        const proof = this.calProof(
          block,
          transactions,
          slot)
        
        if(newTx.hasOwnProperty(key)) {
          console.log('update 1', block.number)
          // inclusion
          this.bigStorage.add(
            slot,
            block.number,
            proof,
            newTx[key].txBytes,
            newTx[key].index
          )
        }else{
          console.log('update 2', block.number)
          // non-inclusion
          if(chunks[slot]) {
            this.bigStorage.add(
              slot,
              block.number,
              proof,
              chunks[slot].txBytes,
              chunks[slot].index
            );
          }else{
            console.log('update 3', block.number)
            this.bigStorage.add(
              slot,
              block.number,
              proof,
              this.zeroHash
            );
          }
        }
      })
    })
    this.storage.store('utxo', this.utxos)
  }

  calProof(blockJson, transactions, chunk) {
    const block = new Block(blockJson.number)
    transactions.forEach(tx => {
      block.appendTx(tx)
    });
    return block.createCoinProof(chunk).toString('hex')
  }

  getUTXOs() {
    return Object.keys(this.utxos).map(k => {
      return TransactionOutput.fromTuple(RLP.decode(Buffer.from(this.utxos[k], 'hex')));
    });
  }

}

module.exports = {
  BaseWallet
}
