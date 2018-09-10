function opTxID(vm) {
	if(!vm.finalized) {
    throw new Error('unfinalized at tzid');
	}
	// vm.chargeCopy(Bytes(vm.TxID[:]))
	vm.push(vm.txid);
}

function opFinalize(vm) {
  /*
	anchor := vm.popZeroValue().anchor
  vm.logFinalize(anchor)
  */

  vm.finalized = true
  
  /*
	items := make([][]byte, 0, len(vm.Log))
	for _, item := range vm.Log {
		items = append(items, Encode(item))
	}

	vm.TxID = merkle.Root(items)
  vm.runHooks(vm.onFinalize)
  */
}

module.exports = {
  0x3e: opTxID,
  0x3f: opFinalize
}
