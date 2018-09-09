const RootChain = artifacts.require('RootChain');

contract('RootChain', function ([user, owner, recipient, anotherAccount]) {

  beforeEach(async function () {
    this.rootChain = await RootChain.new();
    this.chain = await this.rootChain.addChain({from: owner});
  });

  describe('addChain', function () {
    it('should add chain', async function () {
      const result = await this.rootChain.addChain.call({from: user});
      assert.equal(result, user);
    });
  });

  describe('deposit', function () {
    it('should deposit', async function () {
      const result = await this.rootChain.deposit(owner, {value: 1});
      assert.equal(result.logs[0].event, 'Deposit');
    });
  });
  
});
