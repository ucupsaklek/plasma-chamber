const assert = require('assert');
const utils = require('ethereumjs-util');
const Block = require('../lib/block');
const {
  Transaction,
  TransactionOutput
} = require('../lib/tx');

describe('Transaction', function() {
  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');
  const coinId1 = 1;
  const privKey1 = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
  const privKey2 = new Buffer('855364a82b6d1405211d4b47926f4aa9fa55175ab2deaf2774e28c2881189cff', 'hex')
  const testAddress1 = utils.privateToAddress(privKey1);
  const testAddress2 = utils.privateToAddress(privKey2);
  const input = new TransactionOutput(
    [testAddress1],
    [coinId1]
  );
  const output = new TransactionOutput(
    [testAddress1],
    [coinId1]
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
      assert.equal(tx.getBytes().toString('hex'), 'f83b8080c180dad9d594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc101c0dad9d594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc101c001');
    });

    it('should return bytes include sigs', function() {
      assert.equal(tx.getBytes(true).toString('hex'), 'f8808080c180dad9d594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc101c0dad9d594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc101c001f843b841890d5fe34ac9b0b4462b954aa65ac43b49f514e1c83facd0ffe05fda1a8e042e016d7fa4debc3ca3f72b3227ee5cbedb745fad5eaf7db2727fa4624cc70cb07e1c');
    });

    it('should return hash', function() {
      assert.equal(tx.hash().toString('hex'), 'd243ee92a809fdf024c599401aee893bdc198469456bfb21b2396c78a3671394');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash().toString('hex'), 'be38e0ba60f6bd18d95ce2a0d8b6c201402e105289b1a8ccd8d42235717da7ac');
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
