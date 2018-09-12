const ChildChain = require("./childchain/lib")
const Listener = require("./listener/lib")
const Rpc = require("./rpc/lib")


let childChain = ChildChain.run()
Listener.run(childChain)
Rpc.run(childChain)