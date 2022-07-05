/**
 * Refer to https://github.com/trezor/blockbook/blob/master/docs/api.md#get-transaction
 */
export type BlockbookTransaction =
  | BlockbookTransactionBTC
  | BlockbookTransactionETH

/**
 * Bitcoin-type coins
 */
export interface BlockbookTransactionBTC {
  txid: string
  version: number
  vin: TxBTCVin[]
  vout: TxBTCVout[]
  blockHash: string
  blockHeight: number
  confirmations: number
  blockTime: number
  value: string
  valueIn: string
  fees: string
  hex: string
}

export interface TxBTCVin {
  txid: string
  vout: number
  sequence: number
  n: number
  addresses: string[]
  isAddress: boolean
  value: string
  hex: string
}

export interface TxBTCVout {
  value: string
  n: number
  hex: string
  addresses: string[]
  isAddress: boolean
}

/**
 * Ethereum-type coins
 */
export interface BlockbookTransactionETH {
  txid: string
  vin: EthVin[]
  vout: EthVin[]
  blockHash: string
  blockHeight: number
  confirmations: number
  blockTime: number
  value: string
  fees: string
  tokenTransfers: EthTokenTransfer[]
  ethereumSpecific: EthereumSpecific
}

export interface EthereumSpecific {
  status: number
  nonce: number
  gasLimit: number
  gasUsed: number
  gasPrice: string
  data: string
}

export interface EthTokenTransfer {
  type: string
  from: string
  to: string
  token: string
  name: string
  symbol: string
  decimals: number
  value: string
}

export interface EthVin {
  n: number
  addresses: string[]
  isAddress: boolean
  value?: string
}

export interface EthVout {
  n: number
  addresses: string[]
  isAddress: boolean
  value?: string
}
