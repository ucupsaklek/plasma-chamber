# Plasma Chamber

[![Build Status](https://travis-ci.org/cryptoeconomicslab/plasma-chamber.svg?branch=master)](https://travis-ci.org/cryptoeconomicslab/plasma-chamber)

[![Coverage Status](https://coveralls.io/repos/github/cryptoeconomicslab/plasma-chamber/badge.svg?branch=master)](https://coveralls.io/github/cryptoeconomicslab/plasma-chamber?branch=master)

**This is experimental software, don't run in production.**

## Overview

Plasma is a scaling framework for blockchain, and it's one of the 2nd layer technologies. We use Plasma as a framework for general purpose, like game, asset exchange, etc. Our solution name is "Plasma Chamber", it generate a specific Plasma implementation from Plasma specific language. It's the kind of extention of Plasma Cash, but support more complex transaction without security downside. Firstly we describe the structure and mechanism of chamber, and exit, challenge mecanism. Secondary describe about the language dapp developers write. Finally we explain some challenges and future works.

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
yarn run-all test
```

### Test run


Launch child chain.

```
yarn run start
```

You can use child chain's JSON RPC from a sample app.

https://github.com/cryptoeconomicslab/plasma-sample-app

