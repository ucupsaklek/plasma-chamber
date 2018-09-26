const assert = require('assert');
const utils = require('ethereumjs-util');
const Block = require('../lib/block');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('../lib/tx');

describe('Transaction', function() {
  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
  const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
  const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const input = new TransactionOutput(
    [testAddress1],
    new Asset(zeroAddress, 2)
  );
  const output = new TransactionOutput(
    [testAddress1],
    new Asset(zeroAddress, 2)
  );
  const tx = new Transaction(
    0,    // label
    [0],  // args
    1,     // nonce,
    [input],
    [output]
  );

  describe('create tx', function() {

    const sign1 = tx.sign(privKey1);
    tx.sigs[0] = sign1;

    it('should return bytes', function() {
      assert.equal(tx.getBytes().toString('hex'), 'f8678080c180f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c0f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c001');
    });

    it('should return bytes include sigs', function() {
      assert.equal(tx.getBytes(true).toString('hex'), 'f8ac8080c180f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c0f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c001f843b841df7670f1748b9f52832239cf451cb4cd656a41a34796f6b74b759c3ef1fc7d2b246f40187b53169f046681ea3ba158939b2acfaf9ffea973cd1df6741bf735c41b');
    });

    it('should return hash', function() {
      assert.equal(tx.hash().toString('hex'), '535868f6becf1b11a30693cca9ac6e5938ee015c96326bfc6d7b030bf231f823');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash().toString('hex'), '944cf9830844e27c529eb1478dd2d001667c150ef1df9070fd6377228882ae08');
    });

  });

  describe('decode tx', function() {

    it('should encode and decode', function() {
      const sign1 = tx.sign(privKey1);
      tx.sigs[0] = sign1;
      const encoded = tx.getBytes();
      const decoded = Transaction.fromBytes(encoded);
      assert.equal(decoded.label, 0);
    });

  });

});
