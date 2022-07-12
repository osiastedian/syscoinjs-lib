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

export interface AssetOpts {
  /**
   * Digits precision for this asset. Range is 0 to 8
   */
  precision: number
  /**
   * Symbol up to 8 characters in length in ASCII
   */
  symbol: string
  /**
   * Maximum satoshis for supply. Range is 1 to 1 quintillion (10^18)
   */
  maxsupply: number
  /**
   * Description in ASCII describing token. The description will be encoded via JSON in the pubdata field for the asset and will be in the 'desc' field of the JSON object.
   */
  description?: string
  /**
   * ERC20 address of the contract connected to this SPT for use in the SysEthereum bridge.
   */
  contract?: string
  /**
   * Optional. Notary KeyID, the hash160 of the address used for notarization. Should be P2WPKH.
   */
  notarykeyid?: string
  /**
   * Notary Details
   */
  notarydetails?: {
    /**
     * Fully qualified URL of the notary endpoint. The endpoint will be sent a POST request with transaction hex and some other details in a JSON object and requires a signature signing the transaction following notarization protocol.
     */
    endpoint: string
    /**
     * Default is 0 (false). Instant transfers by blocking double-spends from inputs. Since notarization is happening via API the API can block any double-spend attempts thereby allowing for instant transactions.
     */
    instanttransfers?: number
    /**
     * Default is 0 (false). If HD account XPUB and HD path information is required by the notary to verify change addresses belong to the sender account.
     */
    hdrequired?: number
  }

  /**
   * Enforce auxiliary fees to every transaction on this asset. Fields described below:
   */
  auxfeedetails?: {
    /**
     *  AuxFee KeyID, the hash160 of the address used where fees are paid out to. Should be P2WPKH.
     */
    auxfeekeyid: string
    /**
     *  Array of AuxFee amounts based on total value being sent
     */
    auxfees: {
      /**
       * The amount threshold (in satoshi) where if total output value for this asset is at or above this amount apply a percentage fee.
       */
      bound: number
      /**
       * Percent of total output value applied as a fee. Multiplied by 1000 to avoid floating point precision. For example 1% would be entered as 1000. 0.5% would be entered as 500. 0.001% would be entered as 1 (tenth of a basis point).
       */
      percent: number
    }[]
  }

  /**
   * Defaults to 127 or ALL capabilities. Update capabilities on this asset. Fields are masks which are described below:
   *
   * @example
   * Mask 0 (No flags enabled)
   * Mask 1 (ASSET_UPDATE_DATA, can you update public data field?)
   * Mask 2 (ASSET_UPDATE_CONTRACT, can you update smart contract field?)
   * Mask 4 (ASSET_UPDATE_SUPPLY, can you issue or distribute supply via assetsend?)
   * Mask 8 (ASSET_UPDATE_NOTARY_KEY, can you update notary address?)
   * Mask 16 (ASSET_UPDATE_NOTARY_DETAILS, can you update notary details?)
   * Mask 32 (ASSET_UPDATE_AUXFEE, can you update aux fees?)
   * Mask 64 (ASSET_UPDATE_CAPABILITYFLAGS, can you update capability flags?)
   * Mask 127 (ASSET_CAPABILITY_ALL, All flags enabled)
   */
  updatecapabilityflags?: number
}
