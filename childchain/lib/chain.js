const Block = require('./block');
const { VMHash } = require('../../vm/lib/operations/crypto');
const { assembleSource, PlasmaStateContract, PlasmaStateValue } = require('../../vm');
const Snapshot = require('./state/snapshot');
const Transaction = require('./tx');
const ChainEvent = require('./chainevent');

class Chain {
  
  constructor() {
    this.id = null;
    this.blocks = [];
    this.commitmentTxs = []; // TxVM idiom. Eq pendingTx
    this.snapshot = new Snapshot();
    this.events = new ChainEvent(); // EventEmitter
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

  getLatestBlock(){
    return this.blocks[this.blocks.length - 1];
  }
  
  /**
   * generate block
   */
  generateBlock() {
    const newBlock = new Block(this.getLatestBlock().number + 1);
    thise.emit("BlockGenerated", {
      type: "basic",
      payload: newBlock
    })
  }

}

module.exports = Chain
