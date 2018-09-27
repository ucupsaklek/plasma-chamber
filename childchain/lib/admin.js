const RootChainAbi = require('../assets/RootChain.json').abi;

class Admin {

  constructor(web3, address) {
    this.web3 = web3;
    this.rootChain = new this.web3.eth.Contract(RootChainAbi, address);
  }

  addChain(sender) {
    return this.rootChain.methods.addChain().send({from: sender, gas: 200000})
  }

  getChildChain(childId, blockNumber, sender) {
    return this.rootChain.methods.getChildChain(
      childId,
      blockNumber
    ).send({from: sender, gas: 200000})

  }

}

module.exports = Admin;
