// deploy RLPDecoder

const ethers = require('ethers');
const utils = require("ethereumjs-util");
const assert = require('assert');
const bytecodes = require('./bytescodes.json')

const url = process.argv[2]
const privateKey = process.argv[3]

const httpProvider = new ethers.providers.JsonRpcProvider(url)
const wallet = new ethers.Wallet(privateKey, httpProvider)

const RootChainAbi = [
  'function listToken(address tokenAddress, uint256 denomination)'
]

listToken().then(() => {
  console.log('listTokened!!')
}).catch(e => {
  console.error(2, e)
})


async function listToken() {
  const DAI = '0xc4375b7de8af5a38a93548eb8453a498222c4ff2'
  const contract = new ethers.Contract('0x8b4Cfc22E419491AaC44F973003D136D12c3aE00', RootChainAbi, httpProvider)
  const rootChainContract = contract.connect(wallet)
  const result = await rootChainContract.listToken(
    DAI,
    ethers.utils.bigNumberify('1')
  )
  console.log(result)
  result.wait()
  const receipt = await httpProvider.getTransactionReceipt(result.hash)
  console.log(receipt)
}
