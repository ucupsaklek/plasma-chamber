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
      assert.equal(tx.getBytes().toString('hex'), 'f78080c180f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c0c080');
    });

    it('should return bytes include sigs', function() {
      assert.equal(tx.getBytes(true).toString('hex'), 'f87c8080c180f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c0c080f843b841f0dbd6db93d010881dcecbeb6f5ed182d491d52ebab86cafcf5e2761613cc6ac71631f64d15f7794e20a3dabf4c405b2cf45f74a24f61a17e02c905be6aa5b451c');
    });

    it('should return hash', function() {
      assert.equal(tx.hash(), '652f016e87f16a662143136cec52f31477aa9f39589e4cf0ed53dabbbd206a74');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash(), 'c0025b33a868b51e7c69c323b0a6038dd52a37527845c20164012dae1b6bbf46');
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
