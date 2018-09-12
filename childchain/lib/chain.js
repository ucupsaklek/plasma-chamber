const Block = require('./block');
const { VMHash } = require('../../vm/lib/operations/crypto');
const Transaction = require('./tx');

class Chain {
  
  constructor() {
    this.id = null;
    this.blocks = [];
    this.commitmentTxs = []
    this.snapshot = new Snapshot();
  }

  applyDeposit(event) {
    const returnValues = event.returnValues;
    const tx = this.createDepositTx(
      returnValues.depositor,
      returnValues.amount,
      returnValues.depositBlock
    );
    this.commitmentTxs.push(tx);
    this.generateBlock();
  }
  
  createDepositTx(depositor, amount, depositBlock) {
    const prog = assembleSource('[put [txid 1 roll get 0 checksig verify] yield]');
    const stack = [
      new PlasmaStateValue(amount, new Buffer('d073785d7dffc98c69ef62bbc6c8efde78a3286a848f570f8028695048a8f62d', 'hex', 'anchor')),
      depositor
    ];
    const contract = new PlasmaStateContract('C', 'contractseed', prog, stack);
    const encoded = contract.encode();
    const id = VMHash("SnapshotID", encoded);
    this.snapshot.insertId(id);
    const depositTx = new Transaction();
    depositTx.outputs.push(id);
    return depositTx;
  }
  
  generateBlock() {
    const lastBlock = this.blocks[this.blocks.length - 1];
    const newBlock = new Block(lastBlock);
    const txs = this.commitmentTxs
    txs.filter((tx) => {
      if(Snapshot.applyTx(tx)) {
        return true;
      }else{
        return false
      }
    }).forEach((txs) => {
      newBlock.appendTx(tx);
    });
    this.blocks.push(newBlock);
  }

}

module.exports = Chain
