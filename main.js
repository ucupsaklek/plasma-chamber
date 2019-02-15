const {
  ChainManager,
  MongoDown
} = require('@cryptoeconomicslab/chamber-operator');
const Rpc = require('@cryptoeconomicslab/chamber-rpc');
const leveldown = require('leveldown');

function getOption() {
  const mongoOptions = {
    blockdb: new MongoDown('blockdb'),
    metadb: new MongoDown('metadb'),
    snapshotdb: new MongoDown('snapshotdb')
  }
  const fsOptions = {
    blockdb: leveldown('.db/blockdb'),
    metadb: leveldown('.db/metadb'),
    snapshotdb: leveldown('.db/snapshotdb')
  }
  const storage = process.env.STORAGE || 'leveldown';
  if(storage == 'leveldown') {
    return fsOptions;
  }else if(storage == 'mongodb') {
    return mongoOptions
  }
}

async function main(){
  const chainManager = new ChainManager(
    process.env.OPERATOR_PRIVATE_KEY || '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
    process.env.ROOTCHAIN_ENDPOINT,
    process.env.ROOTCHAIN_ADDRESS
  );
  await chainManager.start(getOption())
  Rpc.run(chainManager.getChain());
  return true;
}

main()
  .then(() => console.log('Chain running. RPC running.') )
  .catch(e=> console.error(e) );
