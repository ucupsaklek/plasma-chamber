/**
 * VirtualMachine
 */
class VirtualMachine {
  constructor() {
    console.log('init vm')
  }

  run() {

  }

  opSplit(value, amount) {
    return [createValue({
      amount: value.amount - amount,
      assetId: value.assetId,
      anchor: null
    }), createValue({
      amount: amount,
      assetId: value.assetId,
      anchor: null
    })];
  }

  opOutput() {
    //check portable
    //program = vm.popBytes()
    //vm.contract.program = prog
    // amount was on the arg stack
    // how to get weight?
    // check the value on the stack
    //snapshot, snapshotID := vm.contract.snapshot()
    //vm.chargeCreate(snapshot)
    //vm.logOutput(snapshotID)
    //vm.unwinding = true    
  }

  createValue(option) {
    return {
      amount: option.amount,
      assetId: option.assetId,
      anchor: option.anchor
    }
  }

}

module.exports = VirtualMachine
