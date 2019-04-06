import { Segment } from './segment';
import { BigNumber } from 'ethers/utils';
import { Address, RLPItem, Hash } from './helpers/types';
import { utils, constants } from 'ethers';
import RLP = utils.RLP
import { DecoderUtility } from './utils/Decoder'

export class StateUpdate {
  segment: Segment
  blkNum: BigNumber
  predicate: Address
  // hex string
  state: string

  constructor(
    segment: Segment,
    blkNum: BigNumber,
    predicate: Address,
    state: string
  ) {
    this.segment = segment
    this.blkNum = blkNum
    this.predicate = predicate
    this.state = state
  }

  getSegment(): Segment {
    return this.segment
  }

  getBlkNum(): BigNumber {
    return this.blkNum
  }

  serialize() {
    return RLP.encode(this.encodeToTuple())
  }

  static deserialize(data: string) {
    return StateUpdate.fromTupl(RLP.decode(data))
  }

  encodeToTuple(): RLPItem[] {
    return [
      this.segment.toBigNumber(),
      this.blkNum,
      this.predicate,
      this.state
    ]
  }

  static fromTupl(data: RLPItem[]) {
    return new StateUpdate(
      Segment.fromBigNumber(utils.bigNumberify(data[0])),
      utils.bigNumberify(data[1]),
      utils.getAddress(data[2]),
      data[3]
    )
  }

  /**
   * for RootChain contract
   */
  encode(): string {
    const predicate = utils.padZeros(utils.arrayify(this.predicate), 32)
    const blkNum = utils.padZeros(utils.arrayify(this.blkNum), 32)
    const segment = utils.padZeros(utils.arrayify(this.segment.toBigNumber()), 32)
    const stateBytes = utils.arrayify(this.state)
    return utils.hexlify(utils.concat([
      predicate,
      blkNum,
      segment,
      stateBytes]))
  }

  hash(): string {
    return utils.keccak256(this.encode())
  }

  getRemainingState(
    state: StateUpdate
  ): StateUpdate[] {
    const newSegments = this.getSegment().sub(state.getSegment())
    return newSegments.map(s => {
      return new StateUpdate(s, this.getBlkNum(), this.predicate, this.state)
    })
  }

  verifyDeprecation(
    hash: Hash,
    newStateUpdate: StateUpdate,
    deprecationWitness: string,
    predicatesManager: PredicatesManager
  ): boolean {
    return predicatesManager.verifyDeprecation(
      this.predicate,
      hash,
      this,
      deprecationWitness,
      newStateUpdate)
  }

  // spesific methods

  isOwnedBy(
    owner: Address,
    predicatesManager: PredicatesManager
  ) {
    return predicatesManager.isOwnedBy(this.predicate, owner, this)
  }

  getOwner() {
    return DecoderUtility.getAddress(this.state)
  }

}

export class PredicatesManager {
  predicates: Map<Address, string>
  name2address: Map<string, Address>

  constructor() {
    this.predicates = new Map<Address, string>()
    this.name2address = new Map<string, Address>()
  }

  addPredicate(predicateAddress: Address, nativePredicate: string) {
    this.predicates.set(predicateAddress, nativePredicate)
    this.name2address.set(nativePredicate, predicateAddress)
  }

  getNativePredicate(nativePredicate: string) {
    const address = this.name2address.get(nativePredicate)
    if(address) return address
    else throw new Error('unknown predicate name')
  }

  verifyDeprecation(
    predicate: Address,
    hash: string,
    stateUpdate: StateUpdate,
    deprecationWitness: string,
    nextStateUpdate: StateUpdate
  ) {
    const native = this.predicates.get(predicate)
    if(native == 'OwnershipPredicate') {
      return OwnershipPredicate.verifyDeprecation(
        hash,
        stateUpdate,
        deprecationWitness,
        nextStateUpdate
      )
    } else if(native == 'PaymentChannelPredicate') {
      return PaymentChannelPredicate.verifyDeprecation(
        hash,
        stateUpdate,
        deprecationWitness,
        nextStateUpdate
      )
    }
    return false
  }

  isOwnedBy(
    predicate: Address,
    owner: Address,
    stateUpdate: StateUpdate,
  ) {
    const native = this.predicates.get(predicate)
    if(native == 'OwnershipPredicate') {
      return OwnershipPredicate.isOwnedBy(owner, stateUpdate)
    }
    return false
  }
}

export class OwnershipPredicate {

  static create(
    segment: Segment,
    blkNum: BigNumber,
    predicate: Address,
    owner: Address
  ) {
    return new StateUpdate(
      segment,
      blkNum,
      predicate,
      DecoderUtility.encode([owner])
    )
  }

  static verifyDeprecation(
    hash: string,
    stateUpdate: StateUpdate,
    deprecationWitness: string,
    nextStateUpdate: StateUpdate
  ): boolean {
    const isContain = stateUpdate.segment.isContain(nextStateUpdate.segment)
    const isCorrectSig = utils.recoverAddress(
      hash, deprecationWitness) == DecoderUtility.getAddress(stateUpdate.state)
    return isContain && isCorrectSig
  }

  static isOwnedBy(
    owner: Address,
    stateUpdate: StateUpdate,
  ): boolean {
    const address32 = DecoderUtility.decode(stateUpdate.state)[0]
    return DecoderUtility.getAddress(address32) == utils.getAddress(owner)
  }

}


export class PaymentChannelPredicate {

  static create(
    segment: Segment,
    blkNum: BigNumber,
    predicate: Address,
    participant1: Address,
    participant2: Address
  ) {
    return new StateUpdate(
      segment,
      blkNum,
      predicate,
      DecoderUtility.encode([participant1, participant2])
    )
  }

  static verifyDeprecation(
    hash: string,
    stateUpdate: StateUpdate,
    deprecationWitness: string,
    nextStateUpdate: StateUpdate
  ): boolean {
    const isContain = stateUpdate.segment.isContain(nextStateUpdate.segment)
    const decoded = DecoderUtility.decode(stateUpdate.state)
    const isCorrectSig1 = utils.recoverAddress(
      hash, utils.hexDataSlice(deprecationWitness, 0, 65)) == DecoderUtility.getAddress(decoded[0])
    const isCorrectSig2 = utils.recoverAddress(
      hash, utils.hexDataSlice(deprecationWitness, 65, 130)) == DecoderUtility.getAddress(decoded[1])
    return isContain && isCorrectSig1 && isCorrectSig2
  }

  static isOwnedBy(
    owner: Address,
    stateUpdate: StateUpdate,
  ): boolean {
    const decoded = DecoderUtility.decode(stateUpdate.state)
    return decoded.map(d => utils.getAddress(d)).indexOf(owner) >= 0
  }

}