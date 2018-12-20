const EventEmitter = require('events');

class Web3EventListener extends EventEmitter {

  constructor(web3, contract, storage, confirmation) {
    super();
    this.web3 = web3;
    this.contract = contract;
    this.seenEvents = storage.load('seenEvents') || {};
    this.confirmation = confirmation;
  }

  async getEvents(event, handler) {
    const block = await this.web3.eth.getBlock('latest');
    const events = await this.contract.getPastEvents(event, {
      fromBlock: block.number - (this.confirmation * 2 + 1),
      toBlock: block.number + 1 - this.confirmation
    });
    events.filter(e => {
      return !this.seenEvents[e.transactionHash];
    }).forEach((e) => {
      if(handler) handler(e);
      this.emit(e);
      this.seenEvents[e.transactionHash] = true;
      this.storage.store('seenEvents', this.seenEvents);
    });
    setTimeout(()=>{
      this.getEvents(event, handler);
    }, 10000);
  }

}

module.exports = Web3EventListener;
