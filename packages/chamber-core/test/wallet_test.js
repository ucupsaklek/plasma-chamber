const assert = require('assert');
const {
  BaseWallet
} = require('../index');
const Block = require('../lib/block');
const {
  TransactionOutput,
  Transaction
} = require('../lib/tx');
const BigNumber = require('bignumber.js');
const utils = require('ethereumjs-util');

describe('BaseWallet', function() {

  describe('updateBlock', function() {

    const privKey = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
    const testAddressBuf = utils.privateToAddress(privKey)
    const testAddress = utils.toChecksumAddress(utils.bufferToHex(testAddressBuf))
    const wallet = new BaseWallet(testAddress)

    const CHUNK_SIZE = BigNumber('1000000000000000000')
    const segment = {start: 0, end: CHUNK_SIZE}
    const ownState = 0
    const blkNum = 54321
    const nonce = 111111
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
      nonce,
      [input],
      [output]
    )

    it('should updateBlock', async function() {
      const nextBlkNum = blkNum + 1
      const block = new Block(nextBlkNum);
      block.appendTx(tx);
      wallet.updateBlock(block);
      const key = output.hash(nextBlkNum).toString('hex');
      const utxo = TransactionOutput.fromBytes(Buffer.from(wallet.utxos[key], 'hex'))
      assert.equal(utxo.hash(nextBlkNum).toString('hex'), key)
      const history = await wallet.bigStorage.get(slot, nextBlkNum)
      assert.equal(
        history.proof,
        block.createCoinProof(slot).toString('hex'))
      assert.equal(wallet.getUTXOs().length, 1)
    });

  });

});
