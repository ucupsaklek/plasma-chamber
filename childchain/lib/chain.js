const utils = require('ethereumjs-util');
const Block = require('./block');
const Snapshot = require('./state/snapshot');
const {
  Transaction,
  TransactionOutput
} = require('./tx');
const ChainEvent = require('./chainevent');

class Chain {
  
  constructor() {
    this.id = null;
    this.block = null;
    this.commitmentTxs = []; // TxVM idiom. Eq pendingTx
    this.snapshot = new Snapshot();
    this.events = new ChainEvent(); // EventEmitter
  }
  setMetaDB(metaDB){
    this.metaDB = metaDB;
  }
  setBlockDB(blockDB){
    this.blockDB = blockDB;
  }
  async setChainID(chainID){
    this.id = chainID;//eq with Operator's Address. See Rootchain.sol
    await this.metaDB.put("chainID", chainID);
  }
  setSnapshot(snapshot){
    this.snapshot = snapshot;
  }
  emit(eventName, payload){
    this.events.emit(eventName, payload)
  }

  /**
   * apply deposit event
   * @param {*} event event object of web3
   */
  async applyDeposit(event) {
    const returnValues = event.returnValues;
    const tx = this.createDepositTx(
      returnValues.depositor,
      returnValues.uid,
      returnValues.amount,
      returnValues.depositBlock
    );
    this.blockHeight++;
    await this.saveBlockHeight();

    const newBlock = new Block(this.blockHeight, true);
    newBlock.appendTx(tx)
    await this.saveBlock(newBlock); //async func

    this.emit("Deposited", {
      type: "deposit",
      payload: tx
    });
    this.emit("BlockGenerated", { payload: newBlock })
  }
  
  createDepositTx(depositor, uid, amount, depositBlock) {
    const output = new TransactionOutput(
      [depositor],
      [uid]
    );
    const depositTx = new Transaction(
      0,        // label
      [],       // args
      0,        // nonce,
      [],       // inputs
      [output]  // outputs
    );
    return depositTx;
  }

  createTx(txData) {
    // decode signedTx
    const tx = Transaction.fromBytes(new Buffer(txData, 'hex'));
    // check signatures
    tx.checkSigns();
    // check state transition
    // TODO
    // applyTx to snapshot
    this.snapshot.applyTx(tx);
    this.commitmentTxs.push(tx);
    return tx.hash();
  }
  
  /**saveBlock
   * generate block
   */
  async generateBlock() {
    if(this.commitmentTxs.length == 0) {
      return;
    }
    const commitmentTxs = [].concat(this.commitmentTxs);
    this.commitmentTxs = []
    this.blockHeight++;
    await this.saveCommitmentTxs();
    await this.saveBlockHeight();

    const newBlock = new Block(this.blockHeight);
    commitmentTxs
      .filter((tx) => !!this.snapshot.applyTx(tx) )
      .forEach((tx) => newBlock.appendTx(tx) );
    await this.saveBlock(newBlock); //async func


    this.emit("BlockGenerated", { payload: newBlock })
  }

  /*
  * Fail-safe for sudden chain crash, resume functions
  * */
  async resume(){
    // leveldb stored string as buffer
    try {
      this.id = (await this.metaDB.get("chainID")).toString()
      this.blockHeight = parseInt((await this.metaDB.get("blockHeight")).toString())
      this.block = JSON.parse((await this.blockDB.get(this.blockHeight)).toString())
      this.commitmentTxs = JSON.parse((await this.metaDB.get("commitmentTxs")).toString())
    } catch (err) {
      if(err.notFound) {
        this.blockHeight = 0;
        this.block = null;
        // there are no inflight transactions?
        this.commitmentTxs = [];
      }else{
        throw err;
      }
    }
  }
  async saveBlock(newBlock){
    await this.blockDB.put(this.blockHeight, newBlock.toString());
  }
  async saveBlockHeight(){
    await this.metaDB.put("blockHeight", this.blockHeight);
  }
  async saveCommitmentTxs(){
    await this.metaDB.put("commitmentTxs", JSON.stringify(this.commitmentTxs));
  }
  async getBlock(blockHeight) {
    const blockStr = await this.blockDB.get(blockHeight);
    return Block.fromString(blockStr);
  }

  gracefulStop(){
    return new Promise((resolve, reject) => {
      this.blockDB.close(_=>{
        this.metaDB.close(_=>{
          this.snapshot.db.close(_=>{
            resolve();
          });
        });
      });
    })
  }

}

module.exports = Chain
