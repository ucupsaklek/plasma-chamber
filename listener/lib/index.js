require("dotenv").config();
const Web3 = require('web3');
const web3 = new Web3(process.env.ROOTCHAIN_ENDPOINT);
const RootChainAbi = require('../assets/RootChain.json').abi;
const utils = require('ethereumjs-util');

const rootChain = new web3.eth.Contract(RootChainAbi, process.env.ROOTCHAIN_ADDRESS);
const privateKeyHex = 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
const privKey = new Buffer(privateKeyHex, 'hex');
const address = utils.privateToAddress(privKey);
web3.eth.defaultAccount = utils.bufferToHex(address);
web3.eth.accounts.wallet.add(utils.bufferToHex(privKey));


class RootChainEventListener {

  constructor() {
    this.seenEvents = {};
  }

  async getEvents(event, confirmation, handler) {
    const block = await web3.eth.getBlock('latest');
    const events = await rootChain.getPastEvents(event, {
      fromBlock: block.number - (confirmation * 2 + 1),
      toBlock: block.number + 1 - confirmation
    });
    events.filter(e => {
      return !this.seenEvents[e.transactionHash];
    }).forEach((e) => {
      handler(e);
      this.seenEvents[e.transactionHash] = true;
    });
    setTimeout(()=>{
      this.getEvents(event, confirmation, handler);
    }, 10000);
  }

}


module.exports.run = childChain => {

  const rootChainEventListener = new RootChainEventListener();
  const RootChainConfirmationBlockNum = 1;

  childChain.events.Ready((e) => {
  })

  childChain.events.Deposited((e) => {
    console.log('childChain.Deposited', e);
  })

  childChain.events.TxAdded(async (e) => {
    await childChain.saveCommitmentTxs(); //async func


    // TODO: Must make it blocksize
    if (childChain.commitmentTxs.length > 100) {
      await childChain.generateBlock();
    }
  })
  childChain.events.BlockGenerated((e) => {
    let newBlock = e.payload;
    /**
     * @param address _chain The index of child chain
     * @param bytes32 _root The merkle root of a child chain transactions.
     */
    const operatorAddress = process.env.OPERATOR_ADDRESS;
    console.log(operatorAddress, utils.bufferToHex(newBlock.merkleHash()))
    rootChain.methods.submitBlock(
      operatorAddress,
      utils.bufferToHex(newBlock.merkleHash())
    ).send({
        from: operatorAddress,
        gas: 200000
      }).then(result => {
        console.log(result.events.BlockSubmitted);
      })
  })
  rootChainEventListener.getEvents('Deposit', RootChainConfirmationBlockNum, async (e) => {
    console.log('eventListener.Deposit', e.transactionHash);
    await childChain.applyDeposit(e);
  })
  // rootChain.events.BlockSubmitted((e) => {
  //   console.log(e);
  // })

}

