import BN from 'bn.js'
import { AuxFeeDetails, SanitizedAuxFeeDetails } from './aux-fee-details'

export interface UtxoObject {
  utxos: UTXO[]
  assets: UtxoAsset[]
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

export interface UTXO {
  txid: string
  vout: number
  address: string
  path: string
  value: BN | string
  assetInfo: UtxoAssetInfo
  confirmations: number
  locktime: number
}

export interface UtxoAssetInfo {
  assetGuid: string
  value: string | BN
}

interface NotaryDetails {
  endPoint: string
  instantTransfers: number
  HDRequired: number
}

interface PubData {
  desc: string
}

export interface SanitizedUtxoObject {
  utxos: UTXO[]
  assets?: Map<string, Object>
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

export interface SanitizedNotaryDetails {
  endpoint: Buffer
  instanttransfers: number
  hdrequired: number
}
