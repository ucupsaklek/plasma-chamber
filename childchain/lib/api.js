const { VirtualMachine } = require('../../vm')
const Shapshot = require('./state/snapshot')

module.exports = {
  apiTx: function(program) {
    return new Promise((resolve, reject) => {
      const vm = VirtualMachine.createVM(program);
      vm.validate(program);
      // create tx from txlog
      const tx = vm.createTx()
      resolve(program);
    })
  }
}