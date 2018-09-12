const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ROOTCHAIN_ENDPOINT));
const RootChainAbi = require('../assets/RootChain.json').abi;

const rootChain = new web3.eth.Contract(RootChainAbi, process.env.ROOTCHAIN_ADDRESS);

module.exports.run = childChain => {
  rootChain.events.Deposit((e) => {
    console.log(e);
  })
}

