# Plasma Chamber

[![Build Status](https://travis-ci.org/cryptoeconomicslab/plasma-chamber.svg?branch=master)](https://travis-ci.org/cryptoeconomicslab/plasma-chamber)

[![Coverage Status](https://coveralls.io/repos/github/cryptoeconomicslab/plasma-chamber/badge.svg?branch=master)](https://coveralls.io/github/cryptoeconomicslab/plasma-chamber?branch=master)

**This is experimental software, don't run in production.**

## Overview

Plasma is a 2nd layer scaling solution focusing on transaction's throughput per second scaling rather than quick finality. Plasma isn't EVM scaling solution but Ethereum security inheritance solution to UTXO transaction, In other words, it aims to give a perfect fund safety, a transaction compresssion, and no guarantee of stability. We often apply Plasma toward several kinds of dapps, like games, asset exchanges, etc. But it requires a team to employee rare and talented Plasma researchers, and so very careful security analysis is needed for each domain specific Plasma. This causes duplicated research for each project, and security insights wouldn't be shared enough. Our solution is coined "Plasma Chamber", it generates a specific Plasma implementation from Plasma specific language. It's a kind of extension of Plasma Cash, but support more complex transaction without security downside.


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
git clone https://github.com/cryptoeconomicslab/plasma-chamber.git
cd plasma-chamber
mkdir .db
yarn
yarn bootstrap
yarn build
```

### Test

Run all tests.

```
yarn test
```

### Test run


Launch child chain.

```
yarn run start
```

You can use child chain's JSON RPC from a sample app.

https://github.com/cryptoeconomicslab/plasma-sample-app

