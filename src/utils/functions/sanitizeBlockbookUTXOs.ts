import bjs, { Network } from 'bitcoinjs-lib'
import BN from 'bn.js'
import {
  SanitizedUtxoObject,
  SanitiziedUtxoAsset,
  UTXO,
  UtxoObject,
} from '../../types/utxo-object'
import { syscoinNetworks } from '../constants'
import getBaseAssetID from './getBaseAssetID'

export interface SanitizeUTXOTxOptions {
  rbf: boolean
  assetWhiteList?: Map<string, Object>
}

export type AssetMap = Map<
  string,
  { changeAddress?: string; outputs: [{ value: BN; address: string }] }
>

/**
 * Sanitize backend provider UTXO objects to be useful for this library
 * @param sysFromXpubOrAddress Required. The XPUB or address that was called to fetch UTXOs
 * @param utxoObj Required. Backend provider UTXO JSON object to be sanitized
 * @param network Optional. Defaults to Syscoin Mainnet. Network to be used to create address for notary and auxfee payout address if those features exist for the asset
 * @param txOpts Optional. If its passed in we use assetWhiteList field of options to skip over (if assetWhiteList is null) UTXO's if they use notarization for an asset that is not a part of assetMap
 * @param assetMap Optional. Destination outputs for transaction requiring UTXO sanitizing, used in assetWhiteList check described above
 * @param excludeZeroConf Optional. False by default. Filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
 * @returns sanitized UTXO object for use internally in this library
 */
export function sanitizeBlockbookUTXOs(
  sysFromXpubOrAddress: string,
  utxoObjValue: UtxoObject | UTXO[],
  networkValue?: Network,
  txOptsValue?: SanitizeUTXOTxOptions,
  assetMap?: AssetMap,
  excludeZeroConf?: boolean
): SanitizedUtxoObject {
  let network = networkValue
  const utxoObj = utxoObjValue as UtxoObject
  let txOpts = txOptsValue

  if (!txOpts) {
    txOpts = { rbf: false }
  }
  const sanitizedUtxos: SanitizedUtxoObject = { utxos: [] }
  if (Array.isArray(utxoObj)) {
    utxoObj.utxos = utxoObj
  }
  if (utxoObj.assets) {
    sanitizedUtxos.assets = new Map()
    utxoObj.assets.forEach((assetValue) => {
      const asset = assetValue
      const assetObj: Partial<SanitiziedUtxoAsset> = {}
      if (asset.contract) {
        asset.contract = asset.contract.replace(/^0x/, '')
        assetObj.contract = Buffer.from(asset.contract, 'hex')
      }
      if (asset.pubData) {
        assetObj.pubdata = Buffer.from(JSON.stringify(asset.pubData))
      }
      if (asset.notaryKeyID) {
        assetObj.notarykeyid = Buffer.from(asset.notaryKeyID, 'base64')
        network = network || syscoinNetworks.mainnet
        assetObj.notaryaddress = bjs.payments.p2wpkh({
          hash: assetObj.notarykeyid,
          network,
        }).address
        // in unit tests notarySig may be provided
        if (asset.notarySig) {
          assetObj.notarysig = Buffer.from(asset.notarySig, 'base64')
        } else {
          // prefill in this likely case where notarySig isn't provided
          assetObj.notarysig = Buffer.alloc(65, 0)
        }
      }
      if (asset.notaryDetails) {
        assetObj.notarydetails = {
          endpoint: null,
          instanttransfers: null,
          hdrequired: null,
        }

        if (asset.notaryDetails.endPoint) {
          assetObj.notarydetails.endpoint = Buffer.from(
            asset.notaryDetails.endPoint,
            'base64'
          )
        } else {
          assetObj.notarydetails.endpoint = Buffer.from('')
        }
        assetObj.notarydetails.instanttransfers =
          asset.notaryDetails.instantTransfers
        assetObj.notarydetails.hdrequired = asset.notaryDetails.HDRequired
      }
      if (asset.auxFeeDetails) {
        assetObj.auxfeedetails = {
          auxfeekeyid: null,
          auxfees: null,
        }
        if (asset.auxFeeDetails.auxFeeKeyID) {
          assetObj.auxfeedetails.auxfeekeyid = Buffer.from(
            asset.auxFeeDetails.auxFeeKeyID,
            'base64'
          )
          assetObj.auxfeedetails.auxfeeaddress = bjs.payments.p2wpkh({
            hash: assetObj.auxfeedetails.auxfeekeyid,
            network: syscoinNetworks.testnet,
          }).address
        } else {
          assetObj.auxfeedetails.auxfeekeyid = Buffer.from('')
        }
        assetObj.auxfeedetails.auxfees = asset.auxFeeDetails.auxFees
      }
      if (asset.updateCapabilityFlags) {
        assetObj.updatecapabilityflags = asset.updateCapabilityFlags
      }

      assetObj.maxsupply = new BN(asset.maxSupply)
      assetObj.precision = asset.decimals

      sanitizedUtxos.assets.set(asset.assetGuid, assetObj)
    })
  }
  if (utxoObj.utxos) {
    utxoObj.utxos.forEach((utxoValue) => {
      const utxo = utxoValue
      // xpub queries will return utxo.address and address queries should use sysFromXpubOrAddress as address is not provided
      utxo.address = utxo.address || sysFromXpubOrAddress
      if (excludeZeroConf && utxo.confirmations <= 0) {
        return
      }
      const newUtxo: Partial<UTXO> & { type: string; txId: string } = {
        type: 'LEGACY',
        address: utxo.address,
        txId: utxo.txid,
        path: utxo.path,
        vout: utxo.vout,
        value: new BN(utxo.value),
        locktime: utxo.locktime,
      }
      if (newUtxo.address.startsWith(network.bech32)) {
        newUtxo.type = 'BECH32'
      }
      if (utxo.assetInfo) {
        const baseAssetID = getBaseAssetID(utxo.assetInfo.assetGuid)
        newUtxo.assetInfo = {
          assetGuid: utxo.assetInfo.assetGuid,
          value: new BN(utxo.assetInfo.value),
        }
        const assetObj = sanitizedUtxos.assets.get(baseAssetID)
        // sanity check to ensure sanitizedUtxos.assets has all of the assets being added to UTXO that are assets
        if (!assetObj) {
          return
        }
        // not sending this asset (assetMap) and assetWhiteList option if set with this asset will skip this check, by default this check is done and inputs will be skipped if they are notary asset inputs and user is not sending those assets (used as gas to fulfill requested output amount of SYS)
        if (
          (!assetMap || !assetMap.has(utxo.assetInfo.assetGuid)) &&
          txOpts.assetWhiteList &&
          !txOpts.assetWhiteList.has(utxo.assetInfo.assetGuid) &&
          !txOpts.assetWhiteList.has(getBaseAssetID(utxo.assetInfo.assetGuid))
        ) {
          console.log('SKIPPING utxo')
          return
        }
      }
      sanitizedUtxos.utxos.push(newUtxo as UTXO)
    })
  }

  return sanitizedUtxos
}

export default sanitizeBlockbookUTXOs
