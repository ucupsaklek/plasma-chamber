const {
  Asset,
  TransactionOutput
} = require('../../../childchain');

class Runtime {
  constructor(facts) {
    this.facts = facts;
    this.variable = {};
  }

  query(label, args, inputs) {
    const fact = this.findFact(label);
    this.inputs = inputs;
    this.args = args;
    this.inputNames = fact.head.args[0].args.map(a => {
      return a.value;
    });
    this.argNames = fact.head.args[1].args.map(a => {
      return a.value;
    });
    this.outputNames = fact.head.args[2].args.map(a => {
      return a.value;
    });
    this.result = {};
    this.outputNames.forEach((o, i) => {
      this.result[o] = inputs[i].clone();
    })
    this.variable = {};
    fact.body.forEach((b) => {
      const name = b.functor.name;
      const args = b.args;
      if(name == 'isAddress') {
        console.log(args[0].value);
      }else if(name == 'own') {
        // owner
        const owner = args[0].value;
        // txo
        const txo = args[1].value;
        if(this.isVariable(owner)) {
          this.substitution(owner, this.resolveValue(txo).owners[0]);
        } else if(this.isVariable(txo)) {
          let txoVal = this.resolveValue(txo)
          txoVal.owners = [this.resolveValue(owner)];
          this.substitution(txo, txoVal);
        } else {
          if(this.resolveValue(txo).owners.indexOf(this.resolveValue(owner)) < 0) {
            throw new Error('not match');
          }
        }
      }
    });
    return Object.keys(this.result).map(key => {
      return this.result[key];
    });
  }

  isVariable(name) {
    return this.outputNames.indexOf(name) >= 0;
  }
  
  resolveValue(name) {
    if(this.inputNames.indexOf(name) >= 0) {
      return this.inputs[this.inputNames.indexOf(name)]
    }
    if(this.argNames.indexOf(name) >= 0) {
      return this.args[this.argNames.indexOf(name)]
    }
    if(this.outputNames.indexOf(name) >= 0) {
      return this.result[name];
    }
    throw new Error('unknown value');
  }

  substitution(name, data) {
    if(this.outputNames.indexOf(name) >= 0) {
      this.result[name] = data;
    }else{
      this.variable[name] = data;
    }
  }

  findFact(name) {
    return this.facts.filter((f) => {
      return f.head.functor.name == name;
    })[0];
  }

}

module.exports = {
  Runtime
}