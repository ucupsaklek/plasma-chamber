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
      assert.equal(tx.getBytes().toString('hex'), 'f83d8080c180dbdad594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc10180c0dbdad594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc10180c001');
    });

    it('should return bytes include sigs', function() {
      assert.equal(tx.getBytes(true).toString('hex'), 'f8828080c180dbdad594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc10180c0dbdad594953b8fb338ef870eda6d74c1dd4769b6c977b8cfc10180c001f843b84126838eb62ef4e4dbd674a98677a05c7ba3296a7c17691c68bcd472b23936b8916d0a190002099264518129a9944639e4e660da24ae817fe08cb3756d1862a5641b');
    });

    it('should return hash', function() {
      assert.equal(tx.hash().toString('hex'), '50bb8fe653a928aa2a52afccf48b674219cc459dcf2b864722d99e71f483cc64');
    });

    it('should return merkleHash', function() {
      assert.equal(tx.merkleHash().toString('hex'), 'e4214a87394dadb32ee01a63ee8b09c3cc23a557b3d7f90778d0d5a516cc8c96');
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
