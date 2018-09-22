const ChildChain = require('./childchain');
const Listener = require('./listener/lib');
const Rpc = require('./rpc/lib');
const leveldown = require('leveldown');

async function main(){
  let childChain = await ChildChain.run({
    blockdb: leveldown('.db/blockdb'),
    metadb: leveldown('.db/metadb'),
    snapshotdb: leveldown('.db/snapshotdb')
  });
  Listener.run(childChain);
  Rpc.run(childChain);
  childChain.emit('Ready', {});
  return true;
}

main()
  .then(() => console.log('Chain running. RPC running.') )
  .catch(e=> console.error(e) );
