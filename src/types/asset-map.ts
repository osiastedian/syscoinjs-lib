import BN from 'bn.js'

export interface AssetMapValue {
  /**
   * Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
   */
  changeAddress?: string
  outputs: {
    /**
     * Big Number representing satoshi's to send. Should be 0 if doing an update
     */
    value: BN
    /**
     * Destination address for asset
     */
    address: string
  }[]
}

/**
 * Index: Numeric Asset GUID you are sending to
 * Value: AssetMapValue
 */
export type AssetMap = Map<string, AssetMapValue>

export default AssetMap
