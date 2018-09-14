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
  setDB(db){
    this.db = db;
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

    this.db.put(this.blockHeight, JSON.stringify(newBlock));

    // TODO: Deal with sudden chain crash = revive newBlock = Save newBlock on leveldb

    this.emit("BlockGenerated", { payload: newBlock })
  }

}

module.exports = Chain
