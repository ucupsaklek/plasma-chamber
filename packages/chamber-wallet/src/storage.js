class StorageInterface {

  static store(key, item) {
  }

  static load(key) {
  }

}

class MockStorage extends StorageInterface {

  static store(key, item) {
  }

  static load(key) {
  }

}

class BigStorageInterface {

  constructor() {
  }

  add(utxoKey, blkNum, proof, txBytes, index) {
  }

  async get(utxoKey, blkNum) {
  }

  async lastTransactions(utxoKey) {

  }

  async searchProof(utxoKey) {

  }

}

class MockBigStorage extends BigStorageInterface {

  constructor() {
    super()
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

module.exports = {
  StorageInterface,
  BigStorageInterface,
  MockStorage,
  MockBigStorage
}
