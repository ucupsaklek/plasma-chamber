const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const RootChain = artifacts.require('RootChain');
const Block = require('../../childchain/lib/block');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('../../childchain/lib/tx');
const { VMHash } = require('../../vm/lib/operations/crypto');
const RLP = require('rlp');
const utils = require('ethereumjs-util');
const secp256k1 = require('secp256k1')
const { randomBytes } = require('crypto')
const merkletree = require("merkletree");


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

  describe('verifyTransaction', function () {
    const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
    const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
    const testAddress1 = utils.privateToAddress(privKey1);
    const testAddress2 = utils.privateToAddress(privKey2);
    const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');

    it('should verify transaction', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        new Asset(zeroAddress, 2)
      );
      const output = new TransactionOutput(
        [testAddress2],
        new Asset(zeroAddress, 2)
      );
      const tx = new Transaction(
        0,
        [testAddress2],
        new Date().getTime(),
        [input],
        [output]
      );
      let txBytes = tx.getBytes();
      const sign = tx.sign(privKey1)
      const result = await this.rootChain.verifyTransaction(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(sign),
        {from: user, gasLimit: 200000});
      assert.equal(result, 0);
    });

    it('should verify game transaction', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        new Asset(zeroAddress, 2),
        [testAddress1, testAddress2, 3, 0]
      );
      const output = new TransactionOutput(
        [testAddress2],
        new Asset(zeroAddress, 2),
        [testAddress2, testAddress1, 4, 0]
      );
      const tx = new Transaction(
        100,
        [0, 1],
        new Date().getTime(),
        [input],
        [output]
      );
      let txBytes = tx.getBytes();
      const sign = tx.sign(privKey1)
      const result = await this.rootChain.verifyTransaction(
        utils.bufferToHex(txBytes),
        utils.bufferToHex(sign),
        {from: user, gasLimit: 200000});
      assert.equal(result, 0);
    });

  });

  describe('startExit', function () {
    const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
    const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
    const testAddress1 = utils.privateToAddress(privKey1);
    const testAddress2 = utils.privateToAddress(privKey2);
    const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
    const blockNumber = 1000;
    const utxoPos = blockNumber * 1000000000;

    it('should exit user\'s utxo', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        new Asset(zeroAddress, 2)
      );
      const output = new TransactionOutput(
        [user],
        new Asset(zeroAddress, 2)
      );
      const tx1 = new Transaction(
        0,
        [user],
        1,
        [input],
        [output]
      );
      const tx2 = new Transaction(
        0,
        [user],
        2,
        [input],
        [output]
      );
      let txBytes = tx1.getBytes();
      const sign1 = tx1.sign(privKey1);
      tx1.sigs.push(sign1);
      const sign2 = tx2.sign(privKey1);
      tx2.sigs.push(sign2);
      const block = new Block(1);
      block.appendTx(tx1);
      block.appendTx(tx2);
      const txindex = block.getTxIndex(tx1);
      assert.equal(txindex, 0);
      const rootHash = block.merkleHash();

      const submitBlockResult = await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(rootHash),
        {from: owner, gasLimit: 100000});

      assert.equal(submitBlockResult.logs[0].event, 'BlockSubmitted');

      const getChildChainResult = await this.rootChain.getChildChain(
        owner,
        blockNumber,
        {from: owner, gasLimit: 100000});
      assert.equal(getChildChainResult[0], utils.bufferToHex(rootHash));

      const proof = block.createTxProof(tx1);

      const result = await this.rootChain.startExit(
        owner,
        utxoPos + txindex * 10000,
        utils.bufferToHex(txBytes),
        utils.bufferToHex(proof),
        utils.bufferToHex(sign1),
        {from: user, gasLimit: 100000});
      assert(result.hasOwnProperty('receipt'));

    });
    
  });

});
