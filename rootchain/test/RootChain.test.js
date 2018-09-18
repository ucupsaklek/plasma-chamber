const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const RootChain = artifacts.require('RootChain');
const Block = require('../../childchain/lib/block');
const Transaction = require('../../childchain/lib/tx');
const { PlasmaStateContract } = require('../../vm');
const { VMHash } = require('../../vm/lib/operations/crypto');
const RLP = require('rlp');
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
    const privKey = new Buffer('2bb2ecd1537480b7ecab8b847785025f97ecbe2564489e80217a34339f0ee4b230af9b46bf4b9db3c4cb174ae94839ede8f0b479e8e817467ce8746ad5df6268', 'hex')


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
      tx.sign(privKey)
      tx2.sign(privKey)
      block.appendTx(tx);
      block.appendTx(tx2);
      let proof = block.createTxProof(tx);
      const submitResult = await this.rootChain.submitBlock(
        chain,
        block.merkleHash(),
        {from: owner});
        console.log(tx.outputs);
        console.log(VMHash('SnapshotID', encoded[0]));
      const startExitResult = await this.rootChain.startExit(
        chain,
        utxoPos,
        utils.bufferToHex(txBytes),
        utils.bufferToHex(snapshot),
        utils.bufferToHex(new Buffer(proof, 'hex')),
        utils.bufferToHex(txidSig),
        {from: user, gasLimit: 100000});
      assert.equal(startExitResult.logs.length, 0);
    });

  });

  
  
});
