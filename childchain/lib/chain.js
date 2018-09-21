const Block = require('./block');
const { VMHash } = require('../../vm/lib/operations/crypto');
const { assembleSource, PlasmaStateContract, PlasmaStateValue } = require('../../vm');
const Snapshot = require('./state/snapshot');
const {
  Asset,
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
  applyDeposit(event) {
    const returnValues = event.returnValues;
    const tx = this.createDepositTx(
      returnValues.depositor,
      returnValues.amount,
      returnValues.depositBlock
    );
    this.commitmentTxs.push(tx);
    this.emit("TxAdded", {
      type: "deposit",
      payload: tx
    });
  }
  
  createDepositTx(depositor, amount, depositBlock) {
    const wethTokenAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
    const output = new TransactionOutput(
      [depositor],
      new Asset(wethTokenAddress, amount)
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
  
  /**
   * generate block
   */
  async generateBlock() {
    this.blockHeight++;
    await this.saveBlockHeight(); //async func

    const newBlock = new Block(this.blockHeight);
    this.commitmentTxs
      .filter((tx) => !!this.snapshot.applyTx(tx) )
      .forEach((tx) => newBlock.appendTx(tx) );
    await this.saveBlock(newBlock); //async func

    this.commitmentTxs = []
    await this.saveCommitmentTxs();

    this.emit("BlockGenerated", { payload: newBlock })
  }

  /*
  * Fail-safe for sudden chain crash, resume functions
  * */
  async resume(){
    // leveldb stored string as buffer
    this.id = (await this.metaDB.get("chainID")).toString()
    try {
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
