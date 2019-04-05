import { SignedTransaction } from './SignedTransaction'
import { BigNumber } from 'ethers/utils';
import { StateUpdate, PredicatesManager } from './StateUpdate';

export class SegmentChecker {

  predicatesManager: PredicatesManager
  leaves: StateUpdate[]

  constructor(predicatesManager: PredicatesManager) {
    this.predicatesManager = predicatesManager
    this.leaves = []
  }

  private _isContain(
    hash: string,
    stateUpdate: StateUpdate,
    deprecationWitness: string
  ) {
    return this.leaves.filter(l => {
      return l.verifyDeprecation(hash, stateUpdate, deprecationWitness, this.predicatesManager)
    }).length > 0
  }

  private _spend(
    hash: string,
    stateUpdate: StateUpdate,
    deprecationWitness: string
  ) {
    const target = this.leaves.filter(l => l.verifyDeprecation(hash, stateUpdate, deprecationWitness, this.predicatesManager))[0]
    this.leaves = this.leaves.filter(l => !(l.verifyDeprecation(hash, stateUpdate, deprecationWitness, this.predicatesManager)))
    if(target) {
      target.getRemainingState(stateUpdate).forEach(newTxo => {
        this.leaves.push(newTxo)
      })
      return true
    } else {
      return false
    }
  }

  private getIndex(stateUpdate: StateUpdate) {
    for(let i=0; i < this.leaves.length;i++) {
      if(this.leaves[i].getSegment().start.gt(stateUpdate.getSegment().start)) {
        return i
      }
    }
    return this.leaves.length
  }

  private _insert(
    newStateUpdate: StateUpdate
  ) {
    const isContains = this.leaves.filter(l => l.getSegment().isContain(newStateUpdate.getSegment()))
    if(isContains.length > 0) {
      return false
    } else {
      const index = this.getIndex(newStateUpdate)
      this.leaves.splice(index, 0, newStateUpdate)
      return true
    }
  }

  isContain(tx: SignedTransaction): boolean {
    return tx.getStateUpdates().reduce((isContain, i) => {
      return isContain && this._isContain(tx.getTxHash(), i, tx.getTransactionWitness())
    }, <boolean>true)
  }

  spend(tx: SignedTransaction) {
    return tx.getStateUpdates().map((i) => {
      return this._spend(tx.getTxHash(), i, tx.getTransactionWitness())
    })
  }

  insert(tx: SignedTransaction) {
    return tx.getStateUpdates().map((o) => {
      return this._insert(o)
    })
  }

  insertDepositTx(deposit: StateUpdate) {
    return this._insert(deposit)
  }

  serialize() {
    return this.leaves.map(l => l.serialize())
  }

  deserialize(data: any[]) {
    this.leaves = data.map(d => {
      return StateUpdate.deserialize(d)
    })
  }

  toObject() {
    return this.leaves.map(l => l.encodeToTuple())
  }

}
