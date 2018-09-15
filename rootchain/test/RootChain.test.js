// const { injectInTruffle } = require('sol-trace');
// injectInTruffle(web3, artifacts);

const RootChain = artifacts.require('RootChain');
const Block = require('../../childchain/lib/block');
const Transaction = require('../../childchain/lib/tx');
const { PlasmaStateContract } = require('../../vm');
const RLP = require('rlp');
const Web3 = require('web3');
const utils = require('ethereumjs-util');

contract('RootChain', function ([user, owner, recipient, anotherAccount]) {

  beforeEach(async function () {
    this.rootChain = await RootChain.new();
    this.chain = await this.rootChain.addChain({from: owner});
  });

  describe('addChain', function () {
    it('should add chain', async function () {
      const result = await this.rootChain.addChain.call({from: user});
      assert.equal(result, user);
    });
  });

  describe('deposit', function () {
    it('should deposit', async function () {
      const result = await this.rootChain.deposit(owner, {value: 1});
      assert.equal(result.logs[0].event, 'Deposit');
    });
  });

  describe('startExit', function () {
    const chain = owner;
    const utxoPos = 1000000000;
    let sigs = "00";

    it('should startExit', async function () {
      const depositResult = await this.rootChain.deposit(owner, {value: 1});
      const block = new Block();
      const tx = new Transaction(Buffer.from([1]));
      const tx2 = new Transaction(Buffer.from([2]));
      const contract = new PlasmaStateContract('C', 'seed', new Buffer('00', 'hex'), []);
      contract.exitor = user;
      const encoded = contract.snapshot();
      const snapshot = encoded[0];
      tx.outputs.push(encoded[1]);
      let txBytes = tx.getBytes();
      const txBytes2 = tx2.getBytes();
      block.appendTx(tx);
      block.appendTx(tx2);
      let proof = block.createTxProof(tx);
      const submitResult = await this.rootChain.submitBlock(
        chain,
        block.merkleHash(),
        {from: owner});
      console.log(snapshot);
      const startExitResult = await this.rootChain.startExit(
        chain,
        utxoPos,
        utils.bufferToHex(txBytes),
        utils.bufferToHex(snapshot),
        utils.bufferToHex(new Buffer(proof, 'hex')),
        utils.bufferToHex(new Buffer(sigs, 'hex')),
        {from: user, gasLimit: 100000});
      assert.equal(startExitResult.logs.length, 0);
    });

  });

  
  
});
