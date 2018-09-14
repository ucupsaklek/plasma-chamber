const Block = require('./block');
const { VMHash } = require('../../vm/lib/operations/crypto');
const { assembleSource, PlasmaStateContract, PlasmaStateValue } = require('../../vm');
const Snapshot = require('./state/snapshot');
const Transaction = require('./tx');
const ChainEvent = require('./chainevent');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ROOTCHAIN_ENDPOINT));
const RootChainAbi = require('../assets/RootChain.json').abi;
const rootChain = new web3.eth.Contract(RootChainAbi, process.env.ROOTCHAIN_ADDRESS);


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
  setChainID(chainID){
    this.id = chainID;//eq with Operator's Address. See Rootchain.sol
    this.metaDB.put("chainID", chainID);
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
    this.replicateTxs();
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

    this.blockDB.put(this.blockHeight, JSON.stringify(newBlock));
    this.metaDB.put("blockHeight", this.blockHeight);

    this.emit("BlockGenerated", { payload: newBlock })
  }

  /*
  * Fail-safe for sudden chain crash
  * */
  async init(){
    this.id = await this.mataDB("chainID")
    this.blockHeight = await this.mataDB("blockHeight")
    this.block = JSON.parse(await this.blockDB(this.blockHeight))
    this.commitmentTxs = JSON.parse(await this.mataDB("txs"))
  }
  replicateTxs(){
    this.metaDB.put("txs", JSON.stringify(this.commitmentTxs));
  }



}

module.exports = Chain
