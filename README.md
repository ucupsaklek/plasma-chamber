# Plasma Chamber

[![Build Status](https://travis-ci.org/cryptoeconomicslab/plasma-chamber.svg?branch=master)](https://travis-ci.org/cryptoeconomicslab/plasma-chamber)

[![Coverage Status](https://coveralls.io/repos/github/cryptoeconomicslab/plasma-chamber/badge.svg?branch=master)](https://coveralls.io/github/cryptoeconomicslab/plasma-chamber?branch=master)

**This is experimental software, don't run in production.**

## Overview
- A generator of single operator PlasmaMVP with embeded TxVM-like contract
- Derived from Kelvin's great article [Why is EVM-on-Plasma hard?](https://medium.com/@kelvinfichter/why-is-evm-on-plasma-hard-bf2d99c48df7)
- Not only for value transfer, but also for some simple application.
- Child chain is UTXO model and they have state.
- Chamber language generates possible state transition at the childchain. And it also generates tx verifier on the rootchain.

## Folder Structure

### rootchain
- Solidity contract for deposit, commit, startExit, exitChallenge, finalizeExit, withdraw, state transition verification

### childchain
- Entrypoint for childchain which interacts with ETH, RPC, DB, VM

### watcher
- Observe childchain's merkle tree.
- Clients' must see his own state on childchain via his local proof
- Watcher will do some more complehensive watching but must be decentralized. See Tesuji Plasma.

## Development

### Install

```
git clone git@github.com:cryptoeconomicslab/plasma-chamber.git
yarn install
```

### Test

Run all tests.

```
yarn all-run test
```

### Test run


Launch child chain.

```
yarn run start
```

You can use child chain's JSON RPC from a sample app.

https://github.com/cryptoeconomicslab/plasma-sample-app

