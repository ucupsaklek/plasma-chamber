const StateERC20 = 0;
const StateERC721 = 1;
const StateValue = 2;
const StateContract = 3;
const StateInt = 4;
const StateBool = 5;
const StateBytes = 6;
const StateList = 7;

class PlasmaState {
  
  constructor(_meta) {
    this._meta = _meta;
  }

}

class PlasmaStateValue {
  
  constructor(amount, assetId, anchor) {
    this.amount = amount;
    this.assetId = assetId;
    this.anchor = anchor;
  }

}

class PlasmaStateContract {
  
  constructor(typecode, seed, program, stack) {
    this.typecode = typecode;
    this.seed = seed;
    this.program = program;
    this.stack = stack;
  }

}

module.exports = {
  PlasmaStateContract: PlasmaStateContract
}
