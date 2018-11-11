const assert = require('assert');
const {
  Transaction,
  TransactionOutput
} = require('../lib/tx');
const Snapshot = require('../lib/state/snapshot');
const utils = require('ethereumjs-util');
const memdown = require('memdown');
const testData = require('./testdata');

describe('snapshot', function() {
  const coinId1 = 1;
  const coinId2= 2;
  const privKey1 = testData.privKey1;
  const privKey2 = testData.privKey2;
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);

  describe('applyTx', function() {
    const input = new TransactionOutput(
      [testAddress1],
      [coinId1],
      [0],
      1
    );
    const invalidInput = new TransactionOutput(
      [testAddress1],
      [coinId2],
      [0],
      1
    );
    const output = new TransactionOutput(
      [testAddress2],
      [coinId1],
      [0]
    );
    const depositTx = new Transaction(
      0,    // label
      [testAddress2],  // args
      1,     // nonce,
      [],
      [input]
    );
    const tx = new Transaction(
      0,    // label
      [testAddress2],  // args
      1,     // nonce,
      [input],
      [output]
    );
    const invalidTx = new Transaction(
      0,    // label
      [testAddress2],  // args
      1,     // nonce,
      [invalidInput],
      [output]
    );
    let snapshot = new Snapshot();

    beforeEach(async function () {
      snapshot.setDB(memdown());
      await snapshot.applyTx(depositTx);
    });

    it('should applyTx', async function() {
      const blkNum = 2;
      const isContain1 = await snapshot.contains(input.hash());
      const passedTx = await snapshot.applyTx(tx, blkNum);
      const isContain2 = await snapshot.contains(input.hash());
      const isContain3 = await snapshot.contains(output.hash(blkNum));
      assert.equal(!!passedTx, true);
      assert.equal(isContain1, true);
      assert.equal(isContain2, false);
      assert.equal(isContain3, true);
    });

    it('should failed to applyTx', async function() {
      const blkNum = 2;
      const isContain1 = await snapshot.contains(invalidInput.hash());
      const passedTx = await snapshot.applyTx(invalidTx, blkNum);
      const isContain2 = await snapshot.contains(invalidInput.hash());
      const isContain3 = await snapshot.contains(output.hash(blkNum));
      assert.equal(!!passedTx, false);
      assert.equal(isContain1, false);
      assert.equal(isContain2, false);
      assert.equal(isContain3, false);
    });


  });

});
