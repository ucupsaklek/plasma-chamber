const utils = require('ethereumjs-util')
const RLP = require('rlp')

const {
  MockStorage,
  MockBigStorage
} = require('./storage')
const Block = require('../block')
const {
  Transaction,
  TransactionOutput
} = require('../tx')

const {
  CHUNK_SIZE
} = require('../constant')


class BaseWallet {
  constructor(_options) {
    this.address = null
    this.utxos = {}
    const options = _options || {}
    this.storage = options.storage || MockStorage
    this.bigStorage = options.bigStorage || new MockBigStorage()
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

  getIndexOfOutput(tx, utxo) {
    let index = 0
    tx.outputs.map((o, i) => {
      if(Buffer.compare(o.hash(utxo.blkNum), utxo.hash()) == 0) {
        index = i
      }
    });
    return index
  }

  hexToTransaction(txBytes) {
    return Transaction.fromBytes(Buffer.from(txBytes, 'hex'));
  }

  async getTransactions(utxo, num) {
    const slots = utxo.value.map(({start, end}) => {
      return TransactionOutput.amountToSlot(CHUNK_SIZE, start)
    })
    const history = await this.bigStorage.get(slots[0], utxo.blkNum)
    const tx = this.hexToTransaction(history.txBytes)
    const prevTxo = tx.inputs[0];
    const prevHistory = await this.bigStorage.get(slots[0], prevTxo.blkNum)
    const prevTx = this.hexToTransaction(prevHistory.txBytes)
    const prevIndex = this.getIndexOfOutput(prevTx, prevTxo)
    const index = this.getIndexOfOutput(tx, utxo)
    return [[
      prevHistory.blkNum,
      prevTx.getBytes(),
      Buffer.from(prevHistory.proof, 'hex'),
      prevTx.sigs[0],
      prevIndex
    ], [
      history.blkNum,
      tx.getBytes(),
      Buffer.from(history.proof, 'hex'),
      tx.sigs[0],
      index
    ]]
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
