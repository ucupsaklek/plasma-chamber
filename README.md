# Plasma Chamber

[![Build Status](https://travis-ci.org/cryptoeconomicslab/ethstacks.svg?branch=master)](https://travis-ci.org/cryptoeconomicslab/ethstacks)

[![Coverage Status](https://coveralls.io/repos/github/cryptoeconomicslab/ethstacks/badge.svg)](https://coveralls.io/github/cryptoeconomicslab/ethstacks)

**This is experimental software, don't run in production.**

## Overview
- A generator of single operator PlasmaMVP with embeded TxVM-like contract
- Derived from Kelvin's great article [Why is EVM-on-Plasma hard?](https://medium.com/@kelvinfichter/why-is-evm-on-plasma-hard-bf2d99c48df7)
- Not only for value transfer, but also for some simple application.
- Child chain is UTXO model and they have state.
- State transition can be verified in child chain and root chain.
- Chamber language generates possible state transition at the childchain. And it also generates tx verifier on the rootchain.
- 

## Folder Structure

### rootchain
- Solidity contract for deposit, commit, startExit, exitChallenge, finalizeExit, withdraw, state transition verification

### childchain
- Entrypoint for childchain which interacts with ETH, RPC, DB, VM

### watcher
- Observe childchain's merkle tree.
- Clients' must see his own state on childchain via his local proof
- Watcher will do some more complehensive watching but must be decentralized. See Tesuji Plasma.

