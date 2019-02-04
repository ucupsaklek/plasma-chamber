const {
  Chain,
  Snapshot
} = require("@layer2/childchain");
const ChainDb = require('./db/chaindb');
const SnapshotDb = require('./db/snapshot');
const RootChainEventListener = require('./event')
const ethers = require('ethers')
require("dotenv").config();

const abi = [
  'event BlockSubmitted(bytes32 _root, uint256 _timestamp, uint256 _blkNum)',
  'event Deposited(address indexed _depositer, uint256 _start, uint256 _end, uint256 _blkNum)',
  'event ExitStarted(address indexed _exitor, bytes32 _txHash, uint256 exitableAt, uint256 _start, uint256 _end)',
  'function deposit() payable',
  'function exit(uint256 _utxoPos, uint256 _start, uint256 _end, bytes _txBytes, bytes _proof, bytes _sig) payable'
]

const privateKey = process.env.OPERATOR_PRIVATE_KEY || 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
const httpProvider = new ethers.providers.JsonRpcProvider(process.env.ROOTCHAIN_ENDPOINT)
const contract = new ethers.Contract(process.env.ROOTCHAIN_ADDRESS, abi, httpProvider)
const wallet = new ethers.Wallet(privateKey, httpProvider)
const rootChain = contract.connect(wallet)

class ChainManager {

  constructor(){
    this.chain = null;
    this.timer = null;
  }

  async getSeenEvents() {
    try {
      const seenEvents = await this.chainDb.get('seenEvents');
      return seenEvents
    }catch(e) {
      return {}
    }
  }

  getChain() {
    return this.chain
  }

  async start (options){
    const blockTime = options.blockTime || 10000;
    const chainDb = new ChainDb(options.blockdb)
    const snapshotDb = new SnapshotDb(options.snapshotdb);
    this.chain = new Chain(
      new Snapshot(snapshotDb),
      chainDb
    );

    const RootChainConfirmationBlockNum = 1;
    const rootChainEventListener = new RootChainEventListener(
      httpProvider,
      process.env.ROOTCHAIN_ADDRESS,
      chainDb,
      await this.getSeenEvents(),
      RootChainConfirmationBlockNum);

    const generateBlock = async () => {
      try {
        if(this.chain.txQueue.length > 0) {
          const root = await this.chain.generateBlock();
          const result = await rootChain.submitBlock(
            root
          ).send({
            from: operatorAddress,
            gas: 200000
          });
          console.log(result.events.BlockSubmitted);
        }
      } catch(e) {
        console.error(e)
      }
      this.timer = setTimeout(generateBlock, blockTime);
    }
    if(blockTime > 0) {
      this.timer = setTimeout(generateBlock, blockTime);
    }

    rootChainEventListener.addEvent('BlockSubmitted', async (e) => {
      console.log('eventListener.BlockSubmitted', e.values._blkNum.toNumber());
      await this.chain.handleSubmit(
        e.values._root,
        e.values._blkNum);
    })
    rootChainEventListener.addEvent('Deposited', async (e) => {
      console.log('eventListener.Deposited', e.values._blkNum.toNumber());
      try {
        await this.chain.handleDeposit(
          e.values._depositer,
          e.values._start,
          e.values._end,
          e.values._blkNum);
        }catch(e) {
        console.error(e)
      }
    })
    rootChainEventListener.addEvent('ExitStarted', async (e) => {
      console.log('eventListener.ExitStarted');
    })
    await rootChainEventListener.initPolling()

    return this.chain;
  }
  
  async stop(){
    if(this.timer) {
      clearTimeout(this.timer);
    }
  }

}

module.exports = ChainManager
