const Block = require('./block');
const { VMHash } = require('../../vm/lib/operations/crypto');
const { assembleSource, PlasmaStateContract, PlasmaStateValue } = require('../../vm');
const Snapshot = require('./state/snapshot');
const Transaction = require('./tx');
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
    const prog = assembleSource('[put [txid 1 roll get 0 checksig verify] yield]');
    const stack = [
      new PlasmaStateValue(amount, new Buffer('d073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d', 'hex', 'anchor')).encode(),
      depositor
    ];
    const contract = new PlasmaStateContract('C', 'contractseed', prog, stack);
    const encoded = contract.snapshot();
    const id = VMHash("SnapshotID", encoded[0]);
    this.snapshot.insertId(id);
    const depositTx = new Transaction();
    depositTx.outputs.push(id);
    return depositTx;
  }
  
  /**
   * generate block
   */
  generateBlock() {
    this.blockHeight++;
    const newBlock = new Block(this.blockHeight);

    // Make snapshot and 
    this.commitmentTxs
      .filter((tx) => !!this.snapshot.applyTx(tx) )
      .forEach((tx) => newBlock.appendTx(tx) );

    this.commitmentTxs = []

    this.emit("BlockGenerated", { payload: newBlock })
  }

  /*
  * Fail-safe for sudden chain crash, resume functions
  * */
  async init(){
    this.id = await this.metaDB.get("chainID")
    this.blockHeight = await this.metaDB.get("blockHeight")
    this.block = JSON.parse(await this.blockDB.get(this.blockHeight))
    this.commitmentTxs = JSON.parse(await this.metaDB.get("commitmentTxs"))
  }
  async resumeCommitmentTxs(){
    await this.metaDB.put("commitmentTxs", JSON.stringify(this.commitmentTxs));
  }
  async resumeBlockHeight(newBlock){
    await this.blockDB.put(this.blockHeight, JSON.stringify(newBlock));
  }
  async resumeBlock(newBlock){
    await this.blockDB.put(this.blockHeight, JSON.stringify(newBlock));
  }
  async resumeBlockHeight(){
    await this.metaDB.put("blockHeight", this.blockHeight);
  }

}

module.exports = Chain
