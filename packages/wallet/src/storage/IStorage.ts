export interface IStorage {
  add(key: string, value: string): boolean
  get(key: string): string
  delete(key: string): boolean
  addProof(key: string, blkNum: number, value: string): Promise<boolean>
  getProof(key: string, blkNum: number): Promise<string>
  addBlockHeader(blkNum: number, value: string): Promise<boolean>
  getBlockHeader(blkNum: number): Promise<string>
  searchBlockHeader(fromBlkNum: number, toBlkNum: number): Promise<{blkNum: number, value: string}[]>
  addAction(id: string, blkNum: number, value: string): Promise<boolean>
  searchActions(blkNum: number): Promise<{blkNum: number, value: string}[]>
}
