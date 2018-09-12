const RLP = require('rlp');
const { VMHash } = require('./operations/crypto');
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
    this.typecode = 'V';
    this.amount = amount;
    this.assetId = assetId;
    this.anchor = anchor;
  }

  isZero() {
    return this.amount == 0;
  }

  encode() {
    return [this.amount, this.assetId, this.anchor];
  }

}

class PlasmaStateContract {
  
  constructor(typecode, seed, program, stack) {
    this.typecode = typecode;
    this.seed = seed;
    this.exitor = null;
    this.program = program;
    this.stack = stack;
    this.weight = [];
  }

  snapshot() {
    this.checkWeight();
    const encoded = RLP.encode([this.typecode, this.seed, this.exitor, this.weight, this.program, encodeStack(this.stack)]);
    const h = VMHash("SnapshotID", encoded)
    return [encoded, h];
  }

  checkWeight() {
    const weight = {}
    this.stack.forEach((s) => {
      if(s.typecode == 'V') {
        if(!weight[s.assetId]) weight[s.assetId] = 0;
        weight[s.assetId] += s.amount;
      }
    })
    for(var w in weight) {
      this.weight.push([w, weight[w]]);
    }
  }

}

function encodeStack(stack) {
  return stack.map((s) => {
    if(s.encode) return s.encode();
    else return s;
  })
}


function contractSnapshot(t) {
  const encoded = RLP.encode([t[0], t[1], t[2], t[3], t[4], encodeStack(t[5])]);
  const h = VMHash("SnapshotID", encoded)
  return [encoded, h];
}

module.exports = {
  PlasmaStateValue: PlasmaStateValue,
  PlasmaStateContract: PlasmaStateContract,
  contractSnapshot: contractSnapshot
}
