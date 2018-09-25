const assert = require('assert');
const MerkleTree = require('../lib/merkle');

describe('MerkleTree', function() {

  describe('verify', function() {

    it('normal', function() {
      const leaf = [];
      leaf[0] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000001', 'hex');
      leaf[1] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000002', 'hex');
      leaf[2] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000003', 'hex');
      leaf[3] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000004', 'hex');
      leaf[4] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000005', 'hex');
      leaf[5] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000006', 'hex');
      const unknownLeaf = new Buffer('111187814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000006', 'hex');
      const tree = new MerkleTree(leaf);
      const root = tree.root();
      const proof = tree.proof(leaf[2]);
      assert.equal(tree.root().toString('hex'), 'b7325a01e0f180eb0392b5593a823707e15888a518c83ae530a527d4863167c6');
      assert.equal(proof.length, 96);
      assert.equal(tree.verify(leaf[2], 2, root, proof), true);
      assert.equal(tree.verify(unknownLeaf, 2, root, proof), false);
    });

    it('odd leaves', function() {
      const leaf = [];
      leaf[0] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000001', 'hex');
      leaf[1] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000002', 'hex');
      leaf[2] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000003', 'hex');
      leaf[3] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000004', 'hex');
      leaf[4] = new Buffer('f19587814e8e932897572358b3c0ca6d9cbcc71654b1d312195607aa2b000005', 'hex');
      const tree = new MerkleTree(leaf);
      const root = tree.root();
      const proof = tree.proof(leaf[1]);
      assert.equal(tree.root().toString('hex'), '995c6f2888d090e1d56d657ecc4de472e36e81c2470f1df3863370c1a96a6dbb');
      assert.equal(proof.length, 96);
      assert.equal(tree.verify(leaf[1], 1, root, proof), true);
    });

  });

});
