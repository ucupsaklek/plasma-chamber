const { injectInTruffle } = require('sol-trace');
injectInTruffle(web3, artifacts);

const RootChain = artifacts.require('RootChain');
const PlasmaChain = artifacts.require('PlasmaChain');
const {
  Block,
  Merkle,
  Transaction,
  TransactionOutput
} = require('@cryptoeconomicslab/chamber-core');
const utils = require('ethereumjs-util');
const {
  increaseTime
} = require('openzeppelin-solidity/test/helpers/increaseTime');
const RLP = require('rlp');
const BigNumber = require('bignumber.js');

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
  const CHUNK_SIZE = BigNumber('1000000000000000000');
  const segment1 = {start: 0, end: CHUNK_SIZE};
  const segment2 = {start: CHUNK_SIZE, end: CHUNK_SIZE.times(2)};
  const gasLimit = 200000;
  const startExitGasLimit = 500000;
  const finalizeExitGasLimit = 300000;
  // 0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3
  // 0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f
  // 0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
  // 0xc88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c
  // 0x388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418

  beforeEach(async function () {
    this.rootChain = await RootChain.new();
    this.plasmaChain = await PlasmaChain.new();
    this.chain = await this.rootChain.addChain(
      this.plasmaChain.address,
      {from: owner, gas: gasLimit});
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
      const result = await this.rootChain.deposit(owner, {value: CHUNK_SIZE.toString()});
      assert.equal(result.logs[0].event, 'Deposit');
    });
  });

  describe('startExit', function () {
    const blockNumber = 1 * 2
    const utxoPos = blockNumber * 1000000;
    const blockNumber2 = 1 * 3;
    const utxoPos2 = blockNumber2 * 1000000;
    const blockNumber3 = 1 * 4;
    const utxoPos3 = blockNumber3 * 1000000;
    const blockNumber4 = 1 * 5;
    const utxoPos4 = blockNumber4 * 1000000;


    const tx11 = createTx(testAddress2, testAddress1, segment1, 0);
    const tx12 = createTx(testAddress2, testAddress1, segment2, 0);
    const sign1 = tx11.sign(privKey2);
    tx11.sigs.push(sign1);
    const sign2 = tx12.sign(privKey2);
    tx12.sigs.push(sign2);
    const block1 = new Block(1);
    block1.appendTx(tx11);
    block1.appendTx(tx12);

    const tx21 = createTx(testAddress1, testAddress3, segment1, blockNumber);
    const tx22 = createTx(testAddress1, testAddress4, segment2, blockNumber);
    const sign21 = tx21.sign(privKey1);
    tx21.sigs.push(sign21);
    const sign22 = tx22.sign(privKey1);
    tx22.sigs.push(sign22);
    const block2 = new Block(1);
    block2.appendTx(tx21);
    block2.appendTx(tx22);

    const tx31 = createTx(testAddress3, testAddress1, segment1, blockNumber2);
    const tx32 = createTx(testAddress4, testAddress1, segment2, blockNumber2);
    const sign31 = tx31.sign(privKey3);
    tx31.sigs.push(sign31);
    const sign32 = tx32.sign(privKey4);
    tx32.sigs.push(sign32);
    const block3 = new Block(1);
    block3.appendTx(tx31);
    block3.appendTx(tx32);

    const tx41 = createTx(testAddress3, testAddress1, segment1, blockNumber3);
    const tx42 = createTx(testAddress1, testAddress2, segment2, blockNumber3);
    const sign41 = tx41.sign(privKey3);
    tx41.sigs.push(sign41);
    const sign42 = tx42.sign(privKey1);
    tx42.sigs.push(sign42);
    const block4 = new Block(1);
    block4.appendTx(tx41);
    block4.appendTx(tx42);

    beforeEach(async function () {
      await this.rootChain.deposit(owner, {value: CHUNK_SIZE.toString()});

      const rootHash1 = block1.merkleHash();
      const rootHash2 = block2.merkleHash();

      const submitBlockResult1 = await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(rootHash1),
        {from: owner, gas: gasLimit});
      const submitBlockGas = await this.rootChain.submitBlock.estimateGas(
        owner,
        utils.bufferToHex(rootHash2),
        {from: owner, gas: gasLimit});
      console.log('submitBlockGas', submitBlockGas);
      await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(rootHash2),
        {from: owner, gas: gasLimit});
      await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(block3.merkleHash()),
        {from: owner, gas: gasLimit});
      await this.rootChain.submitBlock(
        owner,
        utils.bufferToHex(block4.merkleHash()),
        {from: owner, gas: gasLimit});

      assert.equal(submitBlockResult1.logs[0].event, 'BlockSubmitted');

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

      assert.equal(
        r1[0], utils.bufferToHex(rootHash1)
      )
      assert.equal(
        r2[0], utils.bufferToHex(rootHash2)
      )
      const slot = tx11.outputs[0].getStartSlot(CHUNK_SIZE, 0);
      assert.equal(Merkle.verify(tx11.hash(), slot, new Buffer(r1[0].substr(2), 'hex'), proof1), true);
      assert.equal(Merkle.verify(tx21.hash(), slot, rootHash2, proof2), true);
      assert.equal(Merkle.verify(tx21.hash(), slot, new Buffer(r2[0].substr(2), 'hex'), proof2), true);
      assert.equal(Merkle.verify(tx12.hash(), 1, new Buffer(r1[0].substr(2), 'hex'), block1.createTXOProof(tx12.outputs[0])), true);
      assert.equal(Merkle.verify(tx22.hash(), 1, new Buffer(r2[0].substr(2), 'hex'), block2.createTXOProof(tx22.outputs[0])), true);

      const txInfo = RLP.encode([
        proof2,
        sign21,
        ''
      ]);

      const gas = await this.rootChain.startExit.estimateGas(
        owner,
        blockNumber2,
        0,
        utils.bufferToHex(tx21.getBytes()),
        utils.bufferToHex(txInfo),
        {from: recipient, gas: startExitGasLimit});
      console.log('gas', gas);
      const result = await this.rootChain.startExit(
        owner,
        blockNumber2,
        0,
        utils.bufferToHex(tx21.getBytes()),
        utils.bufferToHex(txInfo),
        {from: recipient, gas: startExitGasLimit});
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
      const slot = tx22.outputs[0].getStartSlot(CHUNK_SIZE, 0);
      const proof = block1.createTXOProof(tx12.outputs[0]);
      const proof2 = block2.createTXOProof(tx22.outputs[0]);

      const txInfo = RLP.encode([
        proof2,
        sign22,
        ''
      ]);

      const result = await this.rootChain.startExit(
        owner,
        blockNumber2,
        0,
        utils.bufferToHex(tx22.getBytes()),
        utils.bufferToHex(txInfo),
        {from: user4, gas: startExitGasLimit});
      assert(result.hasOwnProperty('receipt'));
      const getExitResult1 = await this.rootChain.getExit(
        owner,
        utxoPos2 + slot,
        {from: user, gas: gasLimit});

      assert.equal(getExitResult1[0][0], user4);
      assert.equal(getExitResult1[1][0].toString(), segment2.start.toString());
    });

    it('should finalizeExits', async function () {
      const slot = 0;
      const exitPos = utxoPos2 + slot;
      const getExitResult = await this.rootChain.getExit(
        owner,
        exitPos,
        {from: recipient, gas: gasLimit});
      
      assert.equal(getExitResult[0][0], recipient);
      assert.equal(getExitResult[1][0].toString(), segment1.start.toString());

      increaseTime(15 * 24 * 60 * 60);
      await this.rootChain.finalizeExits(
        owner,
        exitPos,
        {from: recipient, gas: finalizeExitGasLimit});
      const getExitResultAfter = await this.rootChain.getExit(
        owner,
        exitPos,
        {from: user, gas: gasLimit});
      assert.equal(getExitResultAfter[0].length, 0);
      assert.equal(getExitResultAfter[1].length, 0);
    });

    it('should challengeExit', async function () {
      const proof31 = block3.createTxProof(tx31);
      const slot = 0;
      const txList = RLP.encode([
        proof31,
        sign31,
        Buffer.from('', 'hex')
      ]);

      await this.rootChain.challengeAfter(
        owner,
        0,
        blockNumber3,
        utxoPos2 + slot,
        utils.bufferToHex(tx31.getBytes()),
        utils.bufferToHex(txList),
        {from: recipient, gas: startExitGasLimit});
      const getExitResultAfter = await this.rootChain.getExit(
        owner,
        utxoPos2 + slot,
        {from: user, gas: gasLimit});
      assert.equal(getExitResultAfter[0].length, 0);

    });

    describe('challenge game', function() {
      const exitTxInfo = RLP.encode([
        block4.createTXOProof(tx42.outputs[0]),
        sign42,
        ''
      ]);
      const cTxList = RLP.encode([
        block2.createTxProof(tx22),
        sign22,
        Buffer.from('', 'hex')
      ]);
      const slot = 1;

      beforeEach(async function() {
        await this.rootChain.startExit(
          owner,
          blockNumber4,
          0,
          utils.bufferToHex(tx42.getBytes()),
          utils.bufferToHex(exitTxInfo),
          {from: owner, gas: startExitGasLimit});
      });

      it('should challengeBefore', async function () {
        await this.rootChain.challengeBefore(
          owner,
          0,
          blockNumber2,
          utxoPos4 + slot,
          utxoPos2 + slot,
          utils.bufferToHex(tx22.getBytes()),
          utils.bufferToHex(cTxList),
          {from: recipient, gas: startExitGasLimit});

        const getExitResultAfter = await this.rootChain.getExit(
          owner,
          utxoPos4 + slot,
          {from: user, gas: gasLimit});
        assert.equal(getExitResultAfter[3], 1);
      })

      it('should respondChallenge', async function () {
        await this.rootChain.challengeBefore(
          owner,
          0,
          blockNumber2,
          utxoPos4 + slot,
          utxoPos2 + slot,
          utils.bufferToHex(tx22.getBytes()),
          utils.bufferToHex(cTxList),
          {from: recipient, gas: startExitGasLimit});

        const getExitResultAfter = await this.rootChain.getExit(
          owner,
          utxoPos4 + slot,
          {from: user, gas: gasLimit});
        assert.equal(getExitResultAfter[3], 1);

        const proof32 = block3.createTxProof(tx32);
        const rTxList = RLP.encode([
          proof32,
          sign32,
          Buffer.from('', 'hex')
        ]);

        await this.rootChain.respondChallenge(
          owner,
          0,
          blockNumber3,
          utxoPos4 + slot,
          utxoPos2 + slot,
          utils.bufferToHex(tx32.getBytes()),
          utils.bufferToHex(rTxList),
          {from: owner, gas: startExitGasLimit});

        const getExitResultAfterRespond = await this.rootChain.getExit(
          owner,
          utxoPos4 + slot,
          {from: user, gas: gasLimit});
        assert.equal(getExitResultAfterRespond[3].toNumber(), 0);

        await this.rootChain.challengeBefore(
          owner,
          0,
          blockNumber3,
          utxoPos4 + slot,
          utxoPos2 + slot,
          utils.bufferToHex(tx32.getBytes()),
          utils.bufferToHex(rTxList),
          {from: recipient, gas: startExitGasLimit});
        await this.rootChain.respondChallenge(
          owner,
          0,
          blockNumber4,
          utxoPos4 + slot,
          utxoPos2 + slot,
          utils.bufferToHex(tx42.getBytes()),
          utils.bufferToHex(exitTxInfo),
          {from: owner, gas: startExitGasLimit});

        const getExitResultAfterSecondChallenge = await this.rootChain.getExit(
          owner,
          utxoPos4 + slot,
          {from: user, gas: gasLimit});
        assert.equal(getExitResultAfterSecondChallenge[3].toNumber(), 0);

      });

    });

  });

  function createTx(sender, receiver, coinId, blockNumber) {
    const OwnState = 0;
    const standardVerificator = 0;
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
      standardVerificator,
      TransferLabel,
      [receiver],
      Math.floor(Math.random() * 100000),
      [input],
      [output]
    );
  }
  
});
