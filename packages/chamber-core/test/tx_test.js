const assert = require('assert');
const utils = require('ethereumjs-util');
const {
  BufferUtils,
  Transaction,
  TransactionOutput
} = require('../index');
const BigNumber = require('bignumber.js');

describe('Transaction', function() {
  const CHUNK_SIZE = BigNumber('1000000000000000000');
  const segment1 = {start: 0, end: CHUNK_SIZE.minus(1)};
  const segment2 = {start: CHUNK_SIZE, end: CHUNK_SIZE.times(2).minus(1)};
  const ownState = 0;
  const blkNum1 = 123;
  const blkNum2 = 1234567;
  const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
  const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
  const testAddressBuf1 = utils.privateToAddress(privKey1);
  const testAddressBuf2 = utils.privateToAddress(privKey2);
  const testAddress1 = utils.toChecksumAddress(utils.bufferToHex(testAddressBuf1));
  const testAddress2 = utils.toChecksumAddress(utils.bufferToHex(testAddressBuf2));
  const input = new TransactionOutput(
    [testAddress1],
    [segment1],
    [ownState],
    blkNum1
  );
  const output = new TransactionOutput(
    [testAddress2],
    [segment1],
    [ownState]
  );
  const input2 = new TransactionOutput(
    [testAddress1],
    [segment2],
    [ownState],
    blkNum2
  );
  const output2 = new TransactionOutput(
    [testAddress2],
    [segment2],
    [ownState]
  );
  const tx = new Transaction(
    0,    // label
    [testAddressBuf2],  // args
    1,     // nonce,
    [input],
    [output]
  );
  const tx2 = new Transaction(
    0,    // label
    [testAddressBuf2],  // args
    2,     // nonce,
    [input2],
    [output2]
  );
  const input3 = new TransactionOutput(
    [testAddress1],
    [segment2],
    [ownState, BufferUtils.numToBuffer(12345), new Buffer('12345678', 'hex')],
    blkNum2
  );
  const output3 = new TransactionOutput(
    [testAddress2],
    [segment2],
    [ownState, BufferUtils.numToBuffer(12346), new Buffer('23456789', 'hex')]
  );
  const tx3 = new Transaction(
    1,    // label
    [BufferUtils.numToBuffer(12345)],  // args
    3,     // nonce,
    [input3],
    [output3]
  );


  describe('create tx', function() {

    const sign1 = tx.sign(privKey1);
    tx.sigs[0] = sign1;

    it('should return bytes', function() {
      assert.equal(tx.getBytes().toString('hex'), 'f8668080d59434fdeadc2b69fd24f3043a89f9231f10f1284a4ae6e5d594953b8fb338ef870eda6d74c1dd4769b6c977b8cfcbca00880de0b6b3a763ffffc1807be5e4d59434fdeadc2b69fd24f3043a89f9231f10f1284a4acbca00880de0b6b3a763ffffc18001');
    });

    it('should return bytes include sigs', function() {
      assert.equal(tx.getBytes(true).toString('hex'), 'f8ab8080d59434fdeadc2b69fd24f3043a89f9231f10f1284a4ae6e5d594953b8fb338ef870eda6d74c1dd4769b6c977b8cfcbca00880de0b6b3a763ffffc1807be5e4d59434fdeadc2b69fd24f3043a89f9231f10f1284a4acbca00880de0b6b3a763ffffc18001f843b841ea3141c70a3a6bbbf2cdce0987891a19ca6dbae78a127b7c767918d3dc65031123bab438ee67e5f1dcff05198475074ad2d1ab4be7f9782d46550fedcb34406c1b');
    });

    it('should return hash', function() {
      assert.equal(tx.hash().toString('hex'), '227f149fc16214d048589523190a17e478e4a39af6d7635275e420ec42420ff7');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash().toString('hex'), '0106fccd0ac906cf4bc21442c7e932645e302b759f4d75beb1618723c6c01ce6');
    });

  });

  describe('decode tx', function() {

    it('should encode and decode', function() {
      const sign1 = tx.sign(privKey1);
      tx.sigs[0] = sign1;
      const encoded = tx.getBytes();
      const decoded = Transaction.fromBytes(encoded);
      assert.equal(decoded.label, 0);
      assert.equal(decoded.inputs[0].value[0].start.toString(), segment1.start.toString());
      assert.equal(decoded.outputs[0].value[0].start.toString(), segment1.start.toString());
      assert.equal(decoded.inputs[0].blkNum, blkNum1);
      assert.equal(decoded.inputs[0].owners[0], testAddress1);
      assert(typeof decoded.inputs[0].owners[0] == 'string');
      assert(decoded.args[0] instanceof Buffer);
      assert.equal(decoded.label, 0);
    });

    it('should encode and decode bignum', function() {
      const sign1 = tx2.sign(privKey1);
      tx2.sigs[0] = sign1;
      const encoded = tx2.getBytes();
      const decoded = Transaction.fromBytes(encoded);
      assert.equal(decoded.label, 0);
      assert.equal(decoded.inputs[0].value[0].start.toString(), segment2.start.toString());
      assert.equal(decoded.outputs[0].value[0].end.toString(), segment2.end.toString());
      assert.equal(decoded.inputs[0].blkNum, blkNum2);
      assert.equal(decoded.inputs[0].owners[0].toString(), testAddress1.toString());
      assert(typeof decoded.inputs[0].owners[0] == 'string');
      assert.equal(decoded.label, 0);
    });

    it('should not change has after decode', function() {
      const encoded = tx2.getBytes();
      const decoded = Transaction.fromBytes(encoded);
      console.log(tx2.outputs[0].value[0].end)
      console.log(decoded.outputs[0].value[0].end)
      assert.equal(encoded.toString('hex'), decoded.getBytes().toString('hex'));
    });

    it('should not change has after decode 2', function() {
      const encoded = tx3.getBytes();
      const hash1 = tx3.hash();
      const decoded = Transaction.fromBytes(encoded);
      const hash2 = decoded.hash();
      assert.equal(hash1.toString('hex'), hash2.toString('hex'));
    });
    
  });

  describe('decode utxo', function() {

    it('should encode and decode', function() {
      const encoded = input.getBytes();
      const decoded = TransactionOutput.fromBytes(encoded);
      assert(Buffer.compare(input.hash(), decoded.hash()) === 0);
    });

  });

  describe('Transaction.toJson', function() {

    const testTx = new Transaction(
      0,    // label
      [Buffer.from('00', 'hex')],  // args
      1,     // nonce,
      [input],
      [output]
    );

    it('should be converted to json', function() {
      const json = testTx.toJson();
      assert.strictEqual(json.label, 0);
      assert.strictEqual(json.args[0], '00');
    });

  });


});
