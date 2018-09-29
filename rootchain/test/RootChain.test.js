const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const RootChain = artifacts.require('RootChain');
const Block = require('../../childchain/lib/block');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('../../childchain/lib/tx');
const utils = require('ethereumjs-util');
const {
  increaseTime
} = require('openzeppelin-solidity/test/helpers/increaseTime');

contract('RootChain', function ([user, owner, recipient, anotherAccount]) {

  const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
  const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');

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

    it('should verify transaction', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        new Asset(zeroAddress, 2),
        [],
        0,0,0
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
        [testAddress1, testAddress2, 3, 0],
        0,0,0
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
    /*
     * Test Case
     * block1
     *  tx11, tx12
     * block2
     *  tx21, tx22, tx23
     */
    const blockNumber = 1000;
    const utxoPos = blockNumber * 1000000000;
    const blockNumber2 = 1000 * 2;
    const utxoPos2 = blockNumber2 * 1000000000;
    const tx11 = createTx(testAddress1, recipient, 2, 0, 0);
    const tx12 = createTx(testAddress1, user, 2, 0, 0);
    const sign1 = tx11.sign(privKey1);
    tx11.sigs.push(sign1);
    const sign2 = tx12.sign(privKey1);
    tx12.sigs.push(sign2);
    const block1 = new Block(1);
    block1.appendTx(tx11);
    block1.appendTx(tx12);
    const txindex = block1.getTxIndex(tx11);

    const tx21 = createTx(testAddress2, testAddress1, 2, utxoPos, txindex);
    const tx22 = createTx(testAddress1, user, 2, 0, 0);
    const sign21 = tx21.sign(privKey2);
    tx21.sigs.push(sign21);
    const sign22 = tx22.sign(privKey1);
    tx22.sigs.push(sign22);
    const block2 = new Block(1);
    block2.appendTx(tx21);
    block2.appendTx(tx22);

    beforeEach(async function () {
      await this.rootChain.deposit(owner, {value: 10});

      const rootHash = block1.merkleHash();
      assert.equal(txindex, 0);

      const submitBlockResult = await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(rootHash),
        {from: owner, gasLimit: 100000});

      assert.equal(submitBlockResult.logs[0].event, 'BlockSubmitted');

      const proof = block1.createTxProof(tx11);
      const result = await this.rootChain.startExit(
        owner,
        utxoPos + txindex * 10000,
        utils.bufferToHex(tx11.getBytes()),
        utils.bufferToHex(proof),
        utils.bufferToHex(sign1),
        {from: recipient, gasLimit: 100000});
      assert(result.hasOwnProperty('receipt'));

    });

    it('should getChildChain', async function () {
      const getChildChainResult = await this.rootChain.getChildChain(
        owner,
        blockNumber,
        {from: owner, gasLimit: 100000});
      assert.equal(getChildChainResult[0], utils.bufferToHex(block1.merkleHash()));
    });

    it('should startExit', async function () {
      const txindex = block1.getTxIndex(tx12);
      const proof = block1.createTxProof(tx12);
      const result = await this.rootChain.startExit(
        owner,
        utxoPos + txindex * 10000 + 0,
        utils.bufferToHex(tx12.getBytes()),
        utils.bufferToHex(proof),
        utils.bufferToHex(sign2),
        {from: user, gasLimit: 100000});
      assert(result.hasOwnProperty('receipt'));
      const getExitResult1 = await this.rootChain.getExit(
        owner,
        utxoPos + txindex * 10000 + 0,
        {from: user, gasLimit: 100000});

      assert.equal(getExitResult1[0], user);
      assert.equal(getExitResult1[3].toNumber(), 2);
    });

    it('should finalizeExits', async function () {
      const getExitResult = await this.rootChain.getExit(
        owner,
        utxoPos + block1.getTxIndex(tx11) * 10000 + 0,
        {from: recipient, gasLimit: 100000});
      
      assert.equal(getExitResult[0], recipient);
      assert.equal(getExitResult[3].toNumber(), 2);

      increaseTime(15 * 24 * 60 * 60);
      await this.rootChain.finalizeExits(
        owner,
        utils.bufferToHex(zeroAddress),
        {from: recipient, gasLimit: 100000});
      const txindex = block1.getTxIndex(tx12);
      const getRxitResult = await this.rootChain.getExit(
        owner,
        utxoPos + txindex * 10000 + 0,
        {from: user, gasLimit: 100000});
      assert.equal(getRxitResult[0], '0x0000000000000000000000000000000000000000');
      assert.equal(getRxitResult[3].toNumber(), 0);
    });

    it('should challengeExit', async function () {
      const proof21 = block2.createTxProof(tx21);

      try {
        await this.rootChain.challengeExit(
          owner,
          utxoPos2 + block2.getTxIndex(tx21) * 10000,
          0,
          utils.bufferToHex(tx21.getBytes()),
          utils.bufferToHex(proof21),
          utils.bufferToHex(sign21),
          utils.bufferToHex(sign21),
          {from: recipient, gasLimit: 100000});
      } catch(e) {
        assert(e.message.indexOf('revert') >= 0);
      }

    });

  });

  function createTx(sender, receiver, amount, blockNumber, txIndex) {
    const input = new TransactionOutput(
      [sender],
      new Asset(zeroAddress, amount),
      [0],
      blockNumber || 0,
      txIndex || 0,
      0
    );
    const output = new TransactionOutput(
      [receiver],
      new Asset(zeroAddress, amount),
      [0]
    );
    return new Transaction(
      0,
      [receiver],
      (Math.random() * 100000) % 100000,
      [input],
      [output]
    );
  }

});
