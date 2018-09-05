# PlasmaVM

## Overview
- Derived from Kelvin's great article [Why is EVM-on-Plasma hard?](https://medium.com/@kelvinfichter/why-is-evm-on-plasma-hard-bf2d99c48df7))
- Not only for value transfer, but also for some simple contract.
- Consisted by Value and Contract paradigm from TxVM 
- Fund security model is implemented via migration rather than exit
- Multiple Plasma Network is needed

## Folder Structure

### rootchain
- Solidity contract for deposit, commit, startExit, exitChallenge, finalizeExit, withdraw

### childchain
- Entrypoint for childchain which interacts with ETH, RPC, DB, VM

### vm
- Quasi general computation specific virtual machine
- Must remain receipt for state transition especially for owned-asset and locked-asset

### rpc
- HTTP based JSON RPC
- plasma_sendTransaction can call embedded-contracts by refering some function name and args

### storage
- LevelDB or something for storing Tx, receipt and state

### eth
- Adaptor for Ethereum rootchain
- Web3 interface https://github.com/tomusdrw/rust-web3/blob/master/examples/simple_log_sub.rs#L36-L57

### watcher
- Observe childchain's merkle tree.
- Clients' must see his own state on childchain via his local proof
- Watcher will do some more complehensive watching but must be decentralized. See Tesuji Plasma.
