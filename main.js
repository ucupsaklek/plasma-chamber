const {
  ChainManager,
  MongoDown
} = require('@cryptoeconomicslab/chamber-childchain');
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
  const chainManager = new ChainManager();
  await chainManager.start(getOption())
  Rpc.run(chainManager.getChain());
  return true;
}

main()
  .then(() => console.log('Chain running. RPC running.') )
  .catch(e=> console.error(e) );
