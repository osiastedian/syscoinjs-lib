// eslint-disable-next-line no-shadow
export enum Contract {
  // eslint-disable-next-line no-unused-vars
  The0X = '0x',
  // eslint-disable-next-line no-unused-vars
  The0X000000000000000000000000000000000000Dead = '0x000000000000000000000000000000000000dead',
}
export interface PubData {
  desc: string
}

export interface Asset {
  assetGuid: string
  symbol: string
  pubData: PubData | null
  totalSupply: string
  maxSupply: string
  decimals: number
  updateCapabilityFlags: number
  contract: Contract
  precision: number
  Txs: number
}

export interface AssetPage {
  page: number
  totalPages: number
  itemsOnPage: number
  assets: Asset[]
  numAssets: number
}

export interface AssetInformation {
  asset: Asset
  unconfirmedBalance: string
  txs: number
}
