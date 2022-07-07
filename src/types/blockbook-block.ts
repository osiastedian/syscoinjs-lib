export interface BlockTxVin {
  n: number
  value: string
  addresses?: string[]
  isAddress?: boolean
  spent?: boolean
}

export interface BlockTx {
  txid: string
  vin: BlockTxVin[]
  vout: BlockTxVin[]
  blockHash: string
  blockHeight: number
  confirmations: number
  blockTime: number
  value: string
  valueIn: string
  fees: string
}

export interface BlockBookBlock {
  page: number
  totalPages: number
  itemsOnPage: number
  hash: string
  previousBlockHash: string
  nextBlockHash: string
  height: number
  confirmations: number
  size: number
  time: number
  version: number
  merkleRoot: string
  nonce: string
  bits: string
  difficulty: string
  txCount: number
  txs: BlockTx[]
}
