const ethers = require('ethers')
const rootChainInterface = new ethers.utils.Interface(require('../assets/RootChain.json').abi)

class RootChainEventListener {

  constructor(provider, address, chainDb, seenEvents, confirmation) {
    this.provider = provider
    this.address = address
    this.chainDb = chainDb;
    this.seenEvents = seenEvents || {};
    this.checkingEvents = {}
    this.confirmation = confirmation || 1
  }

  addEvent(event, handler) {
    this.checkingEvents[event] = handler
  }

  async initPolling() {
    const block = await this.provider.getBlock('latest');
    await this.polling(block)
    await this.chainDb.insert('seenEvents', JSON.stringify(this.seenEvents));
    setTimeout(async ()=>{
      await this.initPolling();
    }, 10000);

  }

  async polling(block) {
    const events = await this.provider.getLogs({
      address: this.address,
      fromBlock: block.number - (this.confirmation * 2 + 1),
      toBlock: block.number + 1 - this.confirmation
    })
    events.filter(e => {
      return !this.seenEvents[e.transactionHash];
    }).forEach((e) => {
      const logDesc = rootChainInterface.parseLog(e)
      this.checkingEvents[logDesc.name](logDesc)
      this.seenEvents[e.transactionHash] = true;
    });
  }

}

module.exports = RootChainEventListener
