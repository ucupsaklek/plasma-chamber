class Transaction {
  
  constructor() {
    this.id = null;
    this.finalized = 
    this.contracts = [];
    this.timerange = [];
    this.nonces = [];
    // 32 bytes
    this.anchor = null;
    this.inputs = [];
    // deposit amount never change
    // this.issueances = [];
    this.outputs = [];
    // deposit amount never change
    // this.retirements = [];
  }

}

class Weight {

  constructor() {
    this.weth = 0;
    this.erc20 = [];
    this.erc721 = [];
  }

}

class TransactionOutput {

  constructor() {
    this.id = null;
    // sum of values
    this.weight = weight;
    // optional
    this.owner = owner;
    this.seed = null;
    this.stack = [];
    this.program = [];
    this.logpos = 0;
    this.spent = false;
  }

}

