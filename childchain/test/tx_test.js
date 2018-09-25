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
    1     // nonce,
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
      assert.equal(tx.getBytes(true).toString('hex'), 'f87c8080c180f0efd594953b8fb338ef870eda6d74c1dd4769b6c977b8cfd69400000000000000000000000000000000000000000280c0c080f843b841ee7bf9d0f68e1c2a286c8146e43a24a9b1b7b64390751cf19472c52597ce74b8479bfa5b9fce60d5ea4876fe41144d48741c4e47a5c807993e1d8ef0b4ecb3971c');
    });

    it('should return hash', function() {
      assert.equal(tx.hash().toString('hex'), 'f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b0d1812');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash().toString('hex'), '76312c2be5f61150874e02c44126803b6a1df6dad78fbba1ad9ab2a8eb1e1682');
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
