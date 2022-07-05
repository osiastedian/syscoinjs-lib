import BN from 'bn.js'

export interface AssetAllocation {
  assetGuid: string
  values: {
    n: number
    value: BN
  }[]
  notarysig: string | Buffer
}
