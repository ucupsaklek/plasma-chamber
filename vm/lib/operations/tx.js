const MerkleTree = require("merkletree").default;
const RLP = require('rlp');

function opTxID(vm) {
	if(!vm.finalized) {
    throw new Error('unfinalized at tzid');
	}
	// vm.chargeCopy(Bytes(vm.TxID[:]))
	vm.push(new Buffer(vm.txid, 'hex'));
}

function opFinalize(vm) {
	const anchor = vm.popZeroValue().anchor
  vm.logFinalize(anchor)

  vm.finalized = true
  
  const tree = MerkleTree(vm.log.map(l => RLP.encode(l) ));
  vm.txid = tree.root();
}

module.exports = {
  0x3e: opTxID,
  0x3f: opFinalize
}
