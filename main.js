const ChildChain = require("./childchain/lib")
const Listener = require("./listener/lib")
const Rpc = require("./rpc/lib")


async function main(){
    let childChain = await ChildChain.run()
    Listener.run(childChain)
    Rpc.run(childChain)
    childChain.emit("Ready", {});
}

main().resolve()