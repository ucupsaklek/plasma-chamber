function opTxID(vm) {
	if(!vm.finalized) {
    throw new Error('unfinalized at tzid');
	}
	// vm.chargeCopy(Bytes(vm.TxID[:]))
	vm.push(vm.txid);
}

module.exports = {
  0x3e: opTxID
}
