const { VMHash } = require('./crypto');

function opIssue(vm) {
	const tag = vm.pop();
	const amount = vm.pop();
	if(amount < 0) {
    throw new Error('amount is negative');
	}
	const anchor = vm.popZeroValue().anchor

	const assetId = getAssetID(vm.contract.seed, tag)

	const val = vm.createValue(amount, assetId, anchor)
	vm.push(val)

	// vm.logIssuance(int64(amount), assetID[:], anchor)
}

function opAmount(vm) {
	const val = vm.peek();
	vm.push(val.amount);
}

function opAssetID(vm) {
	const val = vm.peek();
	// vm.chargeCopy(Bytes(val.assetId))
	vm.push(val.assetId);
}

function opSplit(vm) {
	const amount = vm.pop();
	if(amount < 0) {
    throw new Error('negative amount at split');
	}

	const a = vm.pop();
	if(amount > a.amount) {
    throw new Error('split error');
	}
	if(process.env.DEBUG) console.log(a, "...in operations/value.js opSplit()")

	const anchor1 = VMHash("Split1", a.anchor);
	const b = vm.createValue(a.amount - amount, a.assetId, anchor1)

	const anchor2 = VMHash("Split2", a.anchor)
	const c = vm.createValue(amount, a.assetId, anchor2)

	vm.push(b)
	vm.push(c)
}

/*
function opMerge(vm *VM) {
	a := vm.popValue()
	b := vm.popValue()

	if !bytes.Equal(a.assetID, b.assetID) {
		panic(errors.WithData(ErrMergeAsset, "a.asset", a.assetID, "b.asset", b.assetID))
	}

	anchor := VMHash("Merge", append(a.anchor, b.anchor...))
	sum, ok := checked.AddInt64(a.amount, b.amount)
	if !ok {
		panic(errors.Wrap(errors.WithData(ErrIntOverflow, "a.amount", a.amount, "b.amount", b.amount), "merge"))
	}
	val := vm.createValue(sum, a.assetID, anchor[:])
	vm.push(val)
}
*/

function getAssetID(contractSeed, tag) {
	return VMHash("AssetID", Buffer.concat([contractSeed, tag], contractSeed.length + tag.length));
}

module.exports = {
  0x32: opSplit,
  0x33: opIssue,
  0x35: opAmount,
  0x36: opAssetID
}
