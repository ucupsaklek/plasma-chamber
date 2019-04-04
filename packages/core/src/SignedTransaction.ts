import { utils, ethers } from "ethers"
import {
  BaseTransaction,
  TransactionDecoder,
  TransactionOutput,
  TransactionOutputDeserializer,
  SplitTransaction
} from './tx'
import {
  HexString,
  Signature,
  Hash
} from './helpers/types'
import { TOTAL_AMOUNT } from './helpers/constants'
import { keccak256, BigNumber } from 'ethers/utils'
import {
  SumMerkleProof, SumMerkleTree
} from './merkle'
import { HexUtil } from './utils/hex'
import { Segment } from './segment';

/**
 * SignedTransaction is the transaction and its signatures
 */
export class SignedTransaction {
  txs: BaseTransaction[]
  signatures: Signature[]

  constructor(
    txs: BaseTransaction[]
  ) {
    this.txs = txs
    this.signatures = []
  }

  withRawSignatures(sigs: Signature[]): SignedTransaction {
    this.signatures = sigs
    return this
  }

  getRawTx(txIndex: number) {
    return this.txs[txIndex]
  }

  getRawTxs() {
    return this.txs
  }

  verify(): boolean {
    return this.txs.reduce((isVerified, tx, index) => {
      return isVerified && tx.verify(this.signatures[index], this.getTxHash())
    }, <boolean>true)
  }
  
  /**
   * sign
   * @param pkey is hex string of private key
   */
  sign(pkey: string) {
    this.signatures.push(this.justSign(pkey))
    this.signatures = this.getRawTxs()[0].normalizeSigs(this.signatures)
  }

  justSign(pkey: string) {
    const key = new utils.SigningKey(pkey)
    return utils.joinSignature(key.signDigest(this.getTxHash()))
  }

  getTxBytes() {
    return HexUtil.concat(this.txs.map(tx => tx.encode()))
  }

  hash() { return this.getTxHash() }

  getTxHash() {
    return utils.keccak256(this.getTxBytes())
  }

  getAllOutputs(): TransactionOutput[] {
    return this.txs.reduce((acc: TransactionOutput[], tx) => {
      return acc.concat(tx.getOutputs())
    }, [])
  }

  getAllInputs(): TransactionOutput[] {
    return this.txs.reduce((acc: TransactionOutput[], tx) => {
      return acc.concat(tx.getInputs())
    }, [])
  }

  getSegments() {
    let segments = this.txs.reduce((segments: Segment[], tx) => {
      return segments.concat(tx.getSegments())
    }, [])
    segments.sort((a, b) => {
      if(a.start.gt(b.start)) return 1
      else if(a.start.lt(b.start)) return -1
      else return 0
    })
    return segments
  }

  /**
   * 
   * @description txs[txIndex].getOutputs(outputIndex)
   */
  getIndex(segment: Segment): any {
    let result
    this.txs.forEach((tx, txIndex) => {
      tx.getSegments().forEach((s, outputIndex) => {
        if(s.start.eq(segment.start)) {
          result = {
            txIndex: txIndex,
            outputIndex: outputIndex
          }
        }
      })
    })
    if(!result) throw new Error('error')
    return result
  }

  getSignatures() {
    return HexUtil.concat(this.signatures)
  }

  serialize() {
    return {
      rawTxs: this.txs.map(tx => tx.serialize()),
      sigs: this.signatures
    }
  }

  static deserialize(data: any): SignedTransaction {
    return new SignedTransaction(data.rawTxs.map((rawTx: any)=>TransactionDecoder.decode(rawTx)))
    .withRawSignatures(data.sigs)
}

}

/**
 * SignedTransactionWithProof is the transaction and its signatures and proof
 */
export class SignedTransactionWithProof {
  signedTx: SignedTransaction
  txIndex: number
  proofs: SumMerkleProof[]
  superRoot: Hash
  root: Hash
  timestamp: BigNumber
  blkNum: BigNumber
  confSigs: Signature[]
  txo: TransactionOutput
  verifiedFlag: boolean

  constructor(
    tx: SignedTransaction,
    txIndex: number,
    superRoot: Hash,
    root: Hash,
    timestamp: BigNumber,
    proofs: SumMerkleProof[],
    blkNum: BigNumber,
    txo?: TransactionOutput
  ) {
    this.signedTx = tx
    this.txIndex = txIndex
    this.superRoot = superRoot
    this.root = root
    this.timestamp = timestamp
    this.proofs = proofs
    this.blkNum = blkNum
    this.confSigs = []
    if(txo) {
      this.txo = txo
    } else {
      this.txo = this.signedTx.getRawTx(this.txIndex).getOutput(0).withBlkNum(this.blkNum)
    }
    this.verifiedFlag = false
  }

  withRawConfSigs(sigs: Signature[]): SignedTransactionWithProof {
    this.confSigs = sigs
    return this
  }

  checkVerified(verifiedFlag: boolean) {
    this.verifiedFlag = verifiedFlag
    return this
  }

  requireConfsig(): boolean {
    return this.getSignedTx().getRawTxs().filter(tx => tx.requireConfsig()).length > 0
  }

  getSignedTx(): SignedTransaction {
    return this.signedTx
  }

  getTxBytes(): HexString {
    return this.getSignedTx().getTxBytes()
  }

  getTxHash(): Hash {
    return this.getSignedTx().getTxHash()
  }

  getStateBytes() {
    return this.getOutput().getBytes()
  }

  getSegment() {
    return this.proofs[this.txIndex].segment
  }
  
  getSuperRoot() {
    return this.superRoot
  }

  getTimestamp(): BigNumber {
    return this.timestamp
  }

  getRoot() {
    return this.root
  }

  getProof(): SumMerkleProof {
    return this.proofs[this.txIndex]
  }

  /**
   * this.txIndex should be 0 or 1
   */
  private getTxOffset(index: number) {
    let offset = ethers.constants.Zero
    for(let i = 0;i < index;i++) {
      const size = this.getTxSize(i)
      offset = offset.add(size)
    }
    return offset
  }

  private getTxSize(i: number) {
    return utils.bigNumberify(utils.hexDataLength(this.signedTx.getRawTx(i).encode()))
  }

  /**
   * @description header structure
   *     numTx       2 bytes
   *     txIndex     2 bytes
   *     merkle root 32 bytes
   *     timestamp   8 bytes
   *     numNodes    2 bytes
   *   proofs
   *     txOffset    2 bytes
   *     txSize      2 bytes
   *     segment     32 bytes
   *     sig         65 bytes
   *     range       8 bytes
   *     proof body  n * 41 bytes
   */
  getProofAsHex(): HexString {
    const numTx = utils.padZeros(utils.arrayify(utils.bigNumberify(this.proofs.length)), 2)
    const txIndex = utils.padZeros(utils.arrayify(utils.bigNumberify(this.txIndex)), 2)
    const rootHeader = utils.arrayify(this.root)
    const timestampHeader = utils.padZeros(utils.arrayify(this.timestamp), 8)
    const proofLength = utils.bigNumberify(utils.hexDataLength(this.proofs[0].proof)).div(41)
    const numNodes = utils.padZeros(utils.arrayify(proofLength), 2)
    const proofs = this.proofs.map((proof, i) => {
      const txOffset = utils.padZeros(utils.arrayify(this.getTxOffset(i)), 2)
      const txSize = utils.padZeros(utils.arrayify(this.getTxSize(i)), 2)
      const segment = utils.padZeros(utils.arrayify(proof.segment.toBigNumber()), 32)
      // initiation_witness
      const sig = utils.arrayify(this.getSignature(i))
      // get original range
      const range: BigNumber = this.getSignedTx().getRawTx(i).getOutput(0).getSegment(0).getAmount()
      const rangeHeader = utils.padZeros(utils.arrayify(range), 8)
      const body = utils.arrayify(proof.toHex())
      return utils.concat([
        txOffset,
        txSize,
        segment,
        sig,
        rangeHeader,
        body])
    })
    return utils.hexlify(utils.concat([numTx, txIndex, rootHeader, timestampHeader, numNodes].concat(proofs)))
  }

  getSignature(i: number) {
    return this.signedTx.signatures[i]
  }

  getSignatures(): HexString {
    return HexUtil.concat(this.signedTx.signatures.concat(this.confSigs))
  }

  getOutput() {
    return this.txo
  }

  merkleHash(): Hash {
    return keccak256(
      utils.hexlify(
        utils.concat([
          utils.arrayify(this.signedTx.hash()),
          utils.arrayify(this.superRoot)])))
  }

  confirmMerkleProofs(pkey: string) {
    const key = new utils.SigningKey(pkey)
    const merkleHash = this.merkleHash()
    this.confSigs.push(utils.joinSignature(key.signDigest(merkleHash)))
    this.confSigs = this.getSignedTx().getRawTx(this.txIndex).normalizeSigs(this.confSigs, merkleHash)
  }

  checkInclusion() {
    return this.proofs.filter(proof => {
      return !SumMerkleTree.verify(
        this.getOutput().getSegment(0).getGlobalStart(),
        this.getOutput().getSegment(0).getGlobalEnd(),
        Buffer.from(this.getTxHash().substr(2), 'hex'),
        TOTAL_AMOUNT.mul(proof.numTokens),
        Buffer.from(this.root.substr(2), 'hex'),
        proof
      )
    }).length == 0
  }

  serialize() {
    return {
      tx: this.getSignedTx().serialize(),
      i: this.txIndex,
      sr: this.superRoot,
      r: this.root,
      ts: this.timestamp.toString(),
      proofs: this.proofs.map(proof => proof.serialize()),
      blkNum: this.blkNum.toString(),
      confSigs: this.confSigs,
      txo: this.txo.serialize(),
      v: this.verifiedFlag
    }
  }

  static deserialize(data: any): SignedTransactionWithProof {
    return new SignedTransactionWithProof(
      SignedTransaction.deserialize(data.tx),
      data.i,
      data.sr,
      data.r,
      utils.bigNumberify(data.ts),
      data.proofs.map((proof: any) => SumMerkleProof.deserialize(proof)),
      utils.bigNumberify(data.blkNum),
      TransactionOutputDeserializer.deserialize(data.txo)
    ).withRawConfSigs(data.confSigs).checkVerified(data.v)
  }

  spend(txo: TransactionOutput) {
    return this.getOutput().getRemainingState(txo).map(newTxo => {
      return new SignedTransactionWithProof(
        this.signedTx,
        this.txIndex,
        this.superRoot,
        this.root,
        this.timestamp,
        this.proofs,
        this.blkNum,
        newTxo
      ).withRawConfSigs(this.confSigs)
    })
  }

}
