const assert = require('assert');
const utils = require('ethereumjs-util');
const Block = require('../lib/block');
const {
  BufferUtils,
  Transaction,
  TransactionOutput
} = require('../lib/tx');

describe('Transaction', function() {
  const coinId1 = 1;
  const coinId2 = 54321;
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
    [coinId1],
    [ownState],
    blkNum1
  );
  const output = new TransactionOutput(
    [testAddress2],
    [coinId1],
    [ownState]
  );
  const input2 = new TransactionOutput(
    [testAddress1],
    [coinId2],
    [ownState],
    blkNum2
  );
  const output2 = new TransactionOutput(
    [testAddress2],
    [coinId2],
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
    [coinId2],
    [ownState, BufferUtils.numToBuffer(12345), new Buffer('12345678', 'hex')],
    blkNum2
  );
  const output3 = new TransactionOutput(
    [testAddress2],
    [coinId2],
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
      assert.equal(tx.getBytes().toString('hex'), 'f8528080d59434fdeadc2b69fd24f3043a89f9231f10f1284a4adcdbd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc101c1807bdbdad59434fdeadc2b69fd24f3043a89f9231f10f1284a4ac101c18001');
    });

    it('should return bytes include sigs', function() {
      assert.equal(tx.getBytes(true).toString('hex'), 'f8978080d59434fdeadc2b69fd24f3043a89f9231f10f1284a4adcdbd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc101c1807bdbdad59434fdeadc2b69fd24f3043a89f9231f10f1284a4ac101c18001f843b8419f0291918e1572c54d1cdf448ab08d329b6cd6a423d517d65ff557fe5b4e37e718672f6668f44411d57aae3a5c9df8bd8967b6f81bf52d3f5ed291c81b608f4f1b');
    });

    it('should return hash', function() {
      assert.equal(tx.hash().toString('hex'), '62095fc46af3c7408fa1d038f083f88cb690e00aaf7b96c90e07b53b739672d2');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash().toString('hex'), '9b054ffd09059df27b260c067ed03fe513203c8e66641dbfb029f6674a6837db');
    });

  });

  describe('decode tx', function() {

    it('should encode and decode', function() {
      const sign1 = tx.sign(privKey1);
      tx.sigs[0] = sign1;
      const encoded = tx.getBytes();
      const decoded = Transaction.fromBytes(encoded);
      assert.equal(decoded.label, 0);
      assert.equal(decoded.inputs[0].value[0], coinId1);
      assert.equal(decoded.outputs[0].value[0], coinId1);
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
      assert.equal(decoded.inputs[0].value[0], coinId2);
      assert.equal(decoded.outputs[0].value[0], coinId2);
      assert.equal(decoded.inputs[0].blkNum, blkNum2);
      assert.equal(decoded.inputs[0].owners[0].toString(), testAddress1.toString());
      assert(typeof decoded.inputs[0].owners[0] == 'string');
      assert.equal(decoded.label, 0);
    });

    it('should not change has after decode', function() {
      const encoded = tx2.getBytes();
      const hash1 = tx2.hash();
      const decoded = Transaction.fromBytes(encoded);
      const hash2 = decoded.hash();
      assert.equal(hash1.toString('hex'), hash2.toString('hex'));
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
