const crypto = require('crypto');
const ed25519 = require('ed25519')

function opVMHash(vm) {
  const f = vm.pop();
  const x = vm.pop();
  const h = VMHash(f, x);
	// vm.chargeCreate(Bytes(h[:]))
	vm.push(h)
}

function opSHA256(vm) {
  const hash = crypto.createHash('sha256');
  const a = vm.pop();
  hash.update(a);
  const h = hash.digest();
	// vm.chargeCreate(h)
	vm.push(h)
}

function opCheckSig(vm) {
  const scheme = vm.pop();
  const sig = vm.pop();
  const pubkey = vm.pop();
  const msg = vm.pop();
	if(sig.length == 0) {
		vm.push(false)
		return
  }
	vm.charge(2048)
  // secp256k1 signatures have scheme Int(0).
  if(scheme == 0) {
    console.log(pubkey.length)
    if(!ed25519.Verify(msg, sig, pubkey)) {
      throw new Error('error signature');
    }
  }else{
    throw new Error('unknown signature schema');
  }
  vm.push(true);
}

function VMHash(f, x) {
  if(typeof f == 'string') {
    f = new Buffer(f);
  }
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.concat([f, x], f.length + x.length));
  return hash.digest();
}

module.exports = {
  0x38: opVMHash,
  0x39: opSHA256,
  0x3b: opCheckSig,
  VMHash: VMHash
}
