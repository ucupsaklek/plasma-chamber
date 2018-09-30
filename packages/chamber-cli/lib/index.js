require("dotenv").config();
const program = require('commander')
const package = require('package')(module)
const Web3 = require('web3');
const {
  RootChain
} = require('../../../childchain');
const {
  getWallet
} = require('./wallet');

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ROOTCHAIN_ENDPOINT));
const wallet = getWallet()
web3.eth.accounts.wallet.add(wallet.getPrivateKeyString())
const operator = wallet.getAddressString();

const rootChain = new RootChain(
  web3,
  process.env.ROOTCHAIN_ADDRESS
)

program
  .version(package.version)
  .parse(process.argv)
  
program
  .command('addchain')
  .action(async function() {
    const result = await rootChain.addChain(operator);
    console.log(result);
  })

program
  .command('getchain')
  .option('-b, --block <block>', 'block number', 0)
  .action(async function(options) {
    const result = await rootChain.getChildChain(operator, options.block, operator);
    console.log(result);
  })

program
  .command('deposit')
  .action(async function(options) {
    const result = await rootChain.deposit(operator, 100, operator);
    console.log(result);
  })

program
  .command('submit')
  .option('-r, --root <root>', 'tx merkle root', '00')
  .action(async function(options) {
    const result = await rootChain.submitBlock(
      operator,
      new Buffer(options.root, 'hex'),
      operator
    );
    console.log(result);
  })

program.parse(process.argv)
