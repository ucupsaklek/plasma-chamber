const RootChain = artifacts.require('RootChain');

contract('RootChain', function ([_, owner, recipient, anotherAccount]) {

  beforeEach(async function () {
    this.rootChain = await RootChain.new();
  });

  describe('addChain', function () {
    it('should add chain', async function () {
      const result = await this.rootChain.addChain.call({value: 1});

      assert.equal(result, 1);
    });
  });

});
