import BN from 'bn.js'
import { AuxFeeDetails, SanitizedAuxFeeDetails } from './aux-fee-details'

export interface UtxoAssetInfo {
  assetGuid: string
  value: string | BN
}

/**
 * Refer to https://github.com/trezor/blockbook/blob/master/docs/api.md#get-utxo
 */
export interface UTXO {
  txid: string
  vout: number
  address: string
  path: string
  value: BN | string
  assetInfo: UtxoAssetInfo
  confirmations: number
  locktime: number
  height: number
  coinbase: boolean
}

interface PubData {
  desc: string
}

interface NotaryDetails {
  endPoint: string
  instantTransfers: number
  HDRequired: number
}

export interface UtxoAsset {
  assetGuid: string
  decimals: number
  pubData: PubData
  symbol: string
  updateCapabilityFlags: number
  totalSupply: string
  maxSupply: string
  notaryKeyID: string
  notaryDetails: NotaryDetails
  notarySig: string
  contract: string
  auxFeeDetails: AuxFeeDetails
}

export interface UtxoObject {
  utxos: UTXO[]
  assets: UtxoAsset[]
}

export interface SanitizedUtxoObject {
  utxos: UTXO[]
  assets?: Map<string, Object>
}

export interface SanitizedNotaryDetails {
  endpoint: Buffer
  instanttransfers: number
  hdrequired: number
}

export interface SanitiziedUtxoAsset {
  contract: Buffer
  pubdata: Buffer
  notarykeyid: Buffer
  notaryaddress: string
  notarysig: Buffer
  notarydetails: SanitizedNotaryDetails
  auxfeedetails: SanitizedAuxFeeDetails
  updatecapabilityflags: number
  maxsupply: BN
  precision: number
}
