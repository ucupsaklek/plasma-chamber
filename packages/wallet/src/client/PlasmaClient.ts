import { INetworkClient } from './JsonRpcClient'
import { IPubsubClient } from './PubsubClient'
import {
  ChamberResult,
  ChamberOk,
  ChamberResultError,
  ChamberError,
  SignedTransactionWithProof,
  Block,
  SwapRequest,
  SignedTransaction
} from '@layer2/core';

export class FastTransferResponse {
  sig: string
  tx: SignedTransaction
  
  constructor(
    sig: string,
    tx: SignedTransaction
  ) {
    this.sig = sig
    this.tx = tx
  }
}

export class PlasmaClient {
  jsonRpcClient: INetworkClient
  mqttClient: IPubsubClient

  constructor(
    client: INetworkClient,
    mqttClient: IPubsubClient
    ) {
    this.jsonRpcClient = client
    this.mqttClient = mqttClient
  }

  static deserialize<T>(serialized: any, handler: (data: any) => T): ChamberResult<T> {
    if(serialized.error) {
      return new ChamberResultError<T>(new ChamberError(serialized.error.code, serialized.error.message))
    } else {
      return new ChamberOk<T>(handler(serialized.result))
    }
  }

  async getBlockNumber(): Promise<number> {
    const res = await this.jsonRpcClient.request('getBlockNumber', {})
    return res.result
  }

  async getBlock(blkNum: number): Promise<ChamberResult<Block>> {
    const res = await this.jsonRpcClient.request('getBlock', [blkNum])
    return PlasmaClient.deserialize<Block>(res, (result) => Block.deserialize(result))
  }

  async getUserTransactions(blkNum: number): Promise<SignedTransactionWithProof[]> {
    const res = await this.jsonRpcClient.request('getUserTransactions', [blkNum])
    return res.result.map((r: string) => SignedTransactionWithProof.deserialize(r))
  }

  async sendTransaction(tx: SignedTransaction): Promise<ChamberResult<boolean>> {
    const res = await this.jsonRpcClient.request('sendTransaction', [tx.serialize()])
    return PlasmaClient.deserialize<boolean>(res, (result) => result as boolean)
  }

  fastTransferToMerchant(to: string, tx: SignedTransaction) {
    this.mqttClient.publish('transfer/' + to, JSON.stringify(tx.serialize()))
  }

  subscribeFastTransfer(myAddress: string, handler: (tx: SignedTransaction) => Promise<void>) {
    this.mqttClient.subscribe('transfer/' + myAddress, (e) => {
      handler(SignedTransaction.deserialize(JSON.parse(e)))
    })
  }

  async fastTransfer(tx: SignedTransaction): Promise<ChamberResult<FastTransferResponse>> {
    const res = await this.jsonRpcClient.request('fastTransfer', [tx.serialize()])
    return PlasmaClient.deserialize<FastTransferResponse>(res, (result: any) => new FastTransferResponse(
      result.sign,
      tx
    ))
  }

  async sendConfsig(tx: SignedTransactionWithProof): Promise<ChamberResult<boolean>> {
    const res = await this.jsonRpcClient.request('sendConfsig', [tx.serialize()])
    return PlasmaClient.deserialize<boolean>(res, (result) => result as boolean)
  }

  async swapRequest(swapRequest: SwapRequest): Promise<ChamberResult<boolean>> {
    const res = await this.jsonRpcClient.request('swapRequest', [swapRequest.serialize()])
    return PlasmaClient.deserialize<boolean>(res, (result) => result as boolean)
  }

  async swapRequestResponse(owner: string, tx: SignedTransaction): Promise<ChamberResult<boolean>> {
    const res = await this.jsonRpcClient.request('swapRequestResponse', [owner, tx.serialize()])
    return PlasmaClient.deserialize<boolean>(res, (result) => result as boolean)
  }

  async getSwapRequest(): Promise<ChamberResult<SwapRequest[]>> {
    const res = await this.jsonRpcClient.request('getSwapRequest', [])
    return PlasmaClient.deserialize<SwapRequest[]>(res, (result) => result.map((r:any) => SwapRequest.deserialize(r)))
  }

  async getSwapRequestResponse(owner: string): Promise<ChamberResult<SignedTransaction>> {
    const res = await this.jsonRpcClient.request('getSwapRequestResponse', [owner])
    return PlasmaClient.deserialize<SignedTransaction>(res, (result) => SignedTransaction.deserialize(result))
  }

  async clearSwapRequestResponse(owner: string): Promise<ChamberResult<boolean>> {
    const res = await this.jsonRpcClient.request('clearSwapRequestResponse', [owner])
    return PlasmaClient.deserialize<boolean>(res, (result) => result as boolean)
  }

}
