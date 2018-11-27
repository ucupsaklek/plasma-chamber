const assert = require('assert');
const {
  BufferUtils
} = require('../index');

describe('BufferUtils', function() {

  describe('bufferToNum', function() {

    const aNum = 0;
    const bNum = 76543;
    const cNum = 1234567;
    const a = BufferUtils.numToBuffer(aNum);
    const b = BufferUtils.numToBuffer(bNum);
    const c = BufferUtils.numToBuffer(cNum);

    it('should return number', function() {
      assert.equal(BufferUtils.bufferToNum(a), aNum);
      assert.equal(BufferUtils.bufferToNum(b), bNum);
      assert.equal(BufferUtils.bufferToNum(c), cNum);
    });

  });

});
