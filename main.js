const ChildChain = require('@cryptoeconomicslab/chamber-childchain');
const Listener = require('@cryptoeconomicslab/chamber-listener');
const Rpc = require('@cryptoeconomicslab/chamber-rpc');
const MongoDown = ChildChain.MongoDown;
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
  let childChain = await ChildChain.run(getOption());
  Listener.run(childChain);
  Rpc.run(childChain);
  childChain.emit('Ready', {});
  return true;
}

main()
  .then(() => console.log('Chain running. RPC running.') )
  .catch(e=> console.error(e) );
