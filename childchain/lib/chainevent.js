const EventEmitter = require('events').EventEmitter;

class ChainEvent extends EventEmitter {
    constructor() {
        super();
    }
    TxAdded(cb){
        this.on("TxAdded", cb)
    }
    BlockGenerated(cb){
        this.on("BlockGenerated", cb)
    }
}