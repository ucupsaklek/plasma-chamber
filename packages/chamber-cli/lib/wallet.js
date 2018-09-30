const hdkey = require('ethereumjs-wallet/hdkey')
const bip39 = require('bip39')
const mnemonics = process.env.MNEMONICS


function getWallet() {
  if(!mnemonics) {
    throw new Error('no mnemonics specified')
  }
  const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonics))
  const node = hdwallet.derivePath(`m/44'/60'/0'/0/0`)
  return node.getWallet()
}

module.exports = {
  getWallet
}
