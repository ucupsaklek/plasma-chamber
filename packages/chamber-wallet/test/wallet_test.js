const assert = require('assert');
const {
  BaseWallet
} = require('../lib');
const {
  Block,
  Constants,
  TransactionOutput,
  Transaction
} = require('@cryptoeconomicslab/chamber-core')
const BigNumber = require('bignumber.js');
const utils = require('ethereumjs-util');

describe('BaseWallet', function() {

  describe('updateHistoryWithBlock', function() {

    const privKey = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
    const testAddressBuf = utils.privateToAddress(privKey)
    const testAddress = utils.toChecksumAddress(utils.bufferToHex(testAddressBuf))

    const CHUNK_SIZE = BigNumber('1000000000000000000')
    const segment = {start: 0, end: CHUNK_SIZE}
    const ownState = 0
    const blkNum = 54321
    const blkNum2 = 54322
    const blkNum3 = 54323
    const input = new TransactionOutput(
      [testAddress],
      [segment],
      [ownState],
      blkNum
    )
    const slot = TransactionOutput.amountToSlot(CHUNK_SIZE, input.value[0].start)
    const output = new TransactionOutput(
      [testAddress],
      [segment],
      [ownState]
    )
    const tx = new Transaction(
      0,
      [testAddressBuf],
      111,
      [input],
      [output]
    )
    const input2 = new TransactionOutput(
      [testAddress],
      [segment],
      [ownState],
      blkNum2
    )
    const output2 = new TransactionOutput(
      [testAddress],
      [segment],
      [ownState]
    )
    const tx2 = new Transaction(
      0,
      [testAddressBuf],
      112,
      [input2],
      [output2]
    )
    const block1 = new Block(blkNum2);
    block1.appendTx(tx);
    const block2 = new Block(blkNum3);
    block2.appendTx(tx2);

    let wallet = null

    beforeEach(function() {
      wallet = new BaseWallet()
      wallet.setAddress(testAddress)
    })

    it('should updateHistoryWithBlock', async function() {
      wallet.updateHistoryWithBlock(block1);
      const key = output.hash(blkNum2).toString('hex');
      const utxo = TransactionOutput.fromBytes(Buffer.from(wallet.utxos[key], 'hex'))
      assert.equal(utxo.hash(blkNum2).toString('hex'), key)
      const history = await wallet.bigStorage.get(slot, blkNum2)
      assert.equal(
        history.proof,
        block1.createCoinProof(slot).toString('hex'))
      assert.equal(wallet.getUTXOs().length, 1)
    });

    it('should getTransactions', async function() {
      wallet.updateHistoryWithBlock(block1);
      wallet.updateHistoryWithBlock(block2);
      const key = output2.hash(blkNum3).toString('hex');
      const utxo = TransactionOutput.fromBytes(Buffer.from(wallet.utxos[key], 'hex'))
      const txList = await wallet.getTransactions(utxo)
      assert.equal(txList.length, 2)
    });

  });

});
