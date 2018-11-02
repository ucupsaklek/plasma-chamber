const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const RootChain = artifacts.require('RootChain');
const Block = require('../../childchain/lib/block');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('../../childchain/lib/tx');
const Merkle = require('../../childchain/lib/smt');
const utils = require('ethereumjs-util');
const {
  increaseTime
} = require('openzeppelin-solidity/test/helpers/increaseTime');
const RLP = require('rlp');

contract('RootChain', function ([user, owner, recipient, user4, user5]) {

  const privKey1 = new Buffer('c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', 'hex')
  const privKey2 = new Buffer('ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', 'hex')
  const privKey3 = new Buffer('0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1', 'hex')
  const privKey4 = new Buffer('c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c', 'hex')
  const privKey5 = new Buffer('388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418', 'hex')
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const testAddress3 = utils.privateToAddress(privKey3);
  const testAddress4 = utils.privateToAddress(privKey4);
  const testAddress5 = utils.privateToAddress(privKey5);
  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
  const coin1Id = 1;
  const coin2Id = 2;
  const gasLimit = 200000;
  const startExitgasLimit = 700000;
  // 0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3
  // 0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f
  // 0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
  // 0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c
  // 0x388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418

  beforeEach(async function () {
    console.log(user);
    this.rootChain = await RootChain.new();
    this.chain = await this.rootChain.addChain({from: owner});
  });

  describe('check', function () {
    it('should same address', async function () {
      assert.equal(utils.bufferToHex(testAddress1), user);
      assert.equal(utils.bufferToHex(testAddress2), owner);
      assert.equal(utils.bufferToHex(testAddress3), recipient);
      assert.equal(utils.bufferToHex(testAddress4), user4);
      assert.equal(utils.bufferToHex(testAddress5), user5);
    });
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
        [coin1Id],
        [0],
        0
      );
      const output = new TransactionOutput(
        [testAddress2],
        [coin1Id],
        [0]
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
        {from: user, gas: gasLimit});
      assert.equal(result, 0);
    });

    it('should verify game transaction', async function () {
      const input = new TransactionOutput(
        [testAddress1],
        [coin1Id],
        [testAddress1, testAddress2, 3, 0],
        0,0,0
      );
      const output = new TransactionOutput(
        [testAddress2],
        [coin1Id],
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
        {from: user, gas: gasLimit});
      assert.equal(result, 0);
    });

  });

  describe('startExit', function () {
    const blockNumber = 1000;
    const utxoPos = blockNumber * 1000000000;
    const blockNumber2 = 1000 * 2;
    const utxoPos2 = blockNumber2 * 1000000000;
    const blockNumber3 = 1000 * 3;
    const utxoPos3 = blockNumber3 * 1000000000;

    const tx11 = createTx(testAddress2, testAddress1, coin1Id, 0);
    const tx12 = createTx(testAddress2, testAddress1, coin2Id, 0);
    const sign1 = tx11.sign(privKey2);
    tx11.sigs.push(sign1);
    const sign2 = tx12.sign(privKey2);
    tx12.sigs.push(sign2);
    const block1 = new Block(1);
    block1.appendTx(tx11);
    block1.appendTx(tx12);

    const tx21 = createTx(testAddress1, testAddress3, coin1Id, blockNumber);
    const tx22 = createTx(testAddress1, testAddress4, coin2Id, blockNumber);
    const sign21 = tx21.sign(privKey1);
    tx21.sigs.push(sign21);
    const sign22 = tx22.sign(privKey1);
    tx22.sigs.push(sign22);
    const block2 = new Block(1);
    block2.appendTx(tx21);
    block2.appendTx(tx22);

    const tx31 = createTx(testAddress3, testAddress1, coin1Id, blockNumber2);
    const tx32 = createTx(testAddress1, testAddress4, coin2Id, blockNumber2);
    const sign31 = tx31.sign(privKey3);
    tx31.sigs.push(sign31);
    const sign32 = tx32.sign(privKey1);
    tx32.sigs.push(sign32);
    const block3 = new Block(1);
    block3.appendTx(tx31);
    block3.appendTx(tx32);

    beforeEach(async function () {
      await this.rootChain.deposit(owner, {value: 10});

      const rootHash1 = block1.merkleHash();
      const rootHash2 = block2.merkleHash();

      const submitBlockResult1 = await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(rootHash1),
        {from: owner, gas: gasLimit});
      const submitBlockResult2 = await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(rootHash2),
        {from: owner, gas: gasLimit});

      assert.equal(submitBlockResult1.logs[0].event, 'BlockSubmitted');
      assert.equal(submitBlockResult2.logs[0].event, 'BlockSubmitted');

      const r1 = await this.rootChain.getChildChain(
        owner,
        blockNumber,
        {from: owner, gas: gasLimit});
      const r2  = await this.rootChain.getChildChain(
        owner,
        blockNumber2,
        {from: owner, gas: gasLimit});

      const proof1 = block1.createTXOProof(tx11.outputs[0]);
      const proof2 = block2.createTXOProof(tx21.outputs[0]);
      console.log(utils.bufferToHex(rootHash1), utils.bufferToHex(rootHash2));

      assert.equal(
        r1[0], utils.bufferToHex(rootHash1)
      )
      assert.equal(
        r2[0], utils.bufferToHex(rootHash2)
      )
      assert.equal(Merkle.verify(tx11.hash(), tx11.outputs[0].value[0], new Buffer(r1[0].substr(2), 'hex'), proof1), true);
      assert.equal(Merkle.verify(tx21.hash(), tx21.outputs[0].value[0], rootHash2, proof2), true);
      assert.equal(Merkle.verify(tx21.hash(), tx21.outputs[0].value[0], new Buffer(r2[0].substr(2), 'hex'), proof2), true);

      const txList = RLP.encode([[
        blockNumber,
        tx11.getBytes(),
        proof1,
        sign1,
        0
      ],[
        blockNumber2,
        tx21.getBytes(),
        proof2,
        sign21,
        0
      ]]);

      const result = await this.rootChain.startExit(
        owner,
        blockNumber2,
        0,
        utils.bufferToHex(txList),
        {from: recipient, gas: startExitgasLimit});
      assert(result.hasOwnProperty('receipt'));

    });

    it('should getChildChain', async function () {
      const getChildChainResult = await this.rootChain.getChildChain(
        owner,
        blockNumber,
        {from: owner, gas: gasLimit});
      assert.equal(getChildChainResult[0], utils.bufferToHex(block1.merkleHash()));
    });

    it('should startExit', async function () {
      const slot = tx22.outputs[0].value[0];
      const proof = block1.createTXOProof(tx12.outputs[0]);
      const proof2 = block2.createTXOProof(tx22.outputs[0]);

      const txList = RLP.encode([[
        blockNumber,
        tx12.getBytes(),
        proof,
        sign2,
        0
      ],[
        blockNumber2,
        tx22.getBytes(),
        proof2,
        sign22,
        0
      ]]);

      const result = await this.rootChain.startExit(
        owner,
        blockNumber2,
        0,
        utils.bufferToHex(txList),
        {from: user4, gas: startExitgasLimit});
      assert(result.hasOwnProperty('receipt'));
      const getExitResult1 = await this.rootChain.getExit(
        owner,
        utxoPos2 + slot * 10000 + 0,
        {from: user, gas: gasLimit});

      assert.equal(getExitResult1[0][0], user4);
      assert.equal(getExitResult1[1][0].toNumber(), coin2Id);
    });

    it('should finalizeExits', async function () {
      const exitPos = utxoPos2 + coin1Id * 10000 + 0;
      const getExitResult = await this.rootChain.getExit(
        owner,
        exitPos,
        {from: recipient, gas: gasLimit});
      
      assert.equal(getExitResult[0][0], recipient);
      assert.equal(getExitResult[1][0].toNumber(), coin1Id);

      increaseTime(15 * 24 * 60 * 60);
      await this.rootChain.finalizeExits(
        owner,
        exitPos,
        {from: recipient, gas: gasLimit});
      const getExitResultAfter = await this.rootChain.getExit(
        owner,
        exitPos,
        {from: user, gas: gasLimit});
      assert.equal(getExitResultAfter[0].length, 0);
      assert.equal(getExitResultAfter[1].length, 0);
    });

    it('should challengeExit', async function () {

      const submitBlockResult = await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(block3.merkleHash()),
        {from: owner, gas: gasLimit});

      assert.equal(submitBlockResult.logs[0].event, 'BlockSubmitted');

      const proof31 = block3.createTxProof(tx31);

      await this.rootChain.challengeAfter(
        owner,
        0,
        blockNumber3,
        utxoPos2 + coin1Id * 10000,
        utils.bufferToHex(tx31.getBytes()),
        utils.bufferToHex(proof31),
        utils.bufferToHex(sign31),
        "",
        {from: recipient, gas: gasLimit});
      const getExitResultAfter = await this.rootChain.getExit(
        owner,
        utxoPos2 + coin1Id * 10000,
        {from: user, gas: gasLimit});
      assert.equal(getExitResultAfter[0].length, 0);

    });

  });

  function createTx(sender, receiver, coinId, blockNumber) {
    const OwnState = 0;
    const TransferLabel = 0;
    const input = new TransactionOutput(
      [sender],
      [coinId],
      [OwnState],
      blockNumber || 0
    );
    const output = new TransactionOutput(
      [receiver],
      [coinId],
      [OwnState]
    );
    return new Transaction(
      TransferLabel,
      [receiver],
      (Math.random() * 100000) % 100000,
      [input],
      [output]
    );
  }

});
