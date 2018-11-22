const {
  Asset,
  TransactionOutput
} = require('../../../childchain');

class Variable {

  constructor(name, value, exists) {
    this.name = name;
    this.value = value;
    this.exists = exists;
  }

  getName() {
    return this.name;
  }

  getValue() {
    return this.value;
  }

  isExists() {
    return this.exists;
  }

}

class Runtime {

  constructor(rules) {
    // rules
    this.rules = rules;
    this.variable = {};
    // proved facts
    this.facts = [];
  }

  addFact(label, args) {
    this.facts[label].push(args);
  }

  getFact(label, values) {
    if(!this.facts[label]) {
      this.facts[label] = [];
    }
    return this.facts[label].map(args => {
      return compareValues(args, values);
    }).filter(i => i != null)[0];

    function compareValues(args, values) {
      if(args.length != values.length) {
        return null;
      }
      const newArgs = args.map((a, i) => {
        if(values[i].isExists()) {
          if(a === values[i]) {
            return a;
          }else{
            return null;
          }
        }else{
          if(a.isExists()) {
            return new Variable(
              a.getName(),
              a.getValue(),
              true
            );
          }else{
            return new Variable(
              a.getName(),
              a.getValue(),
              false
            );
          }
        }
      }).filter(i => i != null);
      if(newArgs.length != values.length) {
        return null;
      }
      return newArgs;
    }

  }

  query(label, args, inputs) {
    const fact = this.findFact(label);
    this.inputs = inputs;
    this.args = args;
    const inputNames = fact.head.args[0].args.map(a => {
      return a.value;
    });
    const argNames = fact.head.args[1].args ? fact.head.args[1].args.map(a => {
      return a.value;
    }) : [];
    inputNames.forEach((name, i) => {
      this.variable[name] = this.inputs[i];
    });
    argNames.forEach((name, i) => {
      this.variable[name] = this.args[i];
    });
    const outputNames = fact.head.args[2].args.map(a => {
      return a.value;
    });
    fact.body.forEach((b) => {
      const name = b.functor.name;
      const args = b.args;
      const values = args.map(argName => {
        return new Variable(
          argName.value,
          this.variable[argName.value],
          !!this.variable[argName.value]
        )
      });
      const matched = this.getFact(name, values);
      Predefined[name](this, values);
      if(matched) {
        console.log('matched', name);
      }
      this.addFact(name, values);
    });
    return outputNames.map(key => {
      return this.variable[key];
    });
  }

  arrayEqual(a, b) {
    if(a.length != b.length) return false;
    return a.filter((item, index) => {
      return item == b[index];
    }).length == a.length;
  }

  isVariable(name) {
    return (this.inputNames.indexOf(name) < 0)
      && (this.argNames.indexOf(name) < 0)
      && (!this.variable.hasOwnProperty(name));
  }
  
  findFact(name) {
    return this.rules.filter((f) => {
      return f.head.functor.name == name;
    })[0];
  }

}

class Predefined {

  static isAddress(ctx, values) {
    
  }

  static isAsset(ctx, values) {
    const data = values[0];
    ctx.variable[data.getName()] = data.getValue()[0];
  }

  static hasState(ctx, values) {
    const txo = values[0];
    const state = values[1];
    if(txo.isExists() && state.isExists()) {
      ctx.variable[txo.getName()].value = state.getValue();
    }else if(txo.isExists()) {
      ctx.variable[state.getName()] = txo.getValue().state;
    }else if(state.isExists()) {
      ctx.variable[txo.getName()] = TransactionOutput.empty();
      ctx.variable[txo.getName()].state = state.getValue();
    }else{

    }
  }

  static hasAsset(ctx, values) {
    const txo = values[0];
    const asset = values[1];
    if(txo.isExists() && asset.isExists()) {
      if(ctx.variable[txo.getName()].value.assetId == null) {
        ctx.variable[txo.getName()].value = asset.getValue();
      }else{
        if(!txo.getValue().value.compare(asset.getValue())) {
          throw new Error('not match at hasAsset');
        }
      }
    }else if(txo.isExists()) {
      ctx.variable[asset.getName()] = txo.getValue().value;
    }else if(asset.isExists()) {
      ctx.variable[txo.getName()] = TransactionOutput.empty();
      ctx.variable[txo.getName()].value = asset.getValue();
    }else{

    }
  }

  static own(ctx, values) {
    const owner = values[0];
    const txo = values[1];
    if(owner.isExists() && txo.isExists()) {
      /*
      if(txo.getValue().owners.indexOf(owner.getValue()) < 0) {
        throw new Error('not match at own');
      }
      */
     ctx.variable[txo.getName()].owners.push(owner.getValue());
    }else if(owner.isExists()) {
      ctx.variable[txo.getName()] = TransactionOutput.empty();
      ctx.variable[txo.getName()].owners.push(owner.getValue());
    }else if(txo.isExists()) {
      ctx.variable[owner.getName()] = txo.getValue().owners[0];
    }else{

    }

  }

}

module.exports = {
  Runtime
}