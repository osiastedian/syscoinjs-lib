
import { Psbt } from 'bitcoinjs-lib'
import syscointx from 'syscointx-js'
import { NotaryAsset } from '../../types/notary-details'

/**
 * Get assets from Result object assigned from syscointx.createTransaction()/syscointx.createAssetTransaction() that require notarization
 * @param psbt Required. PSBT object
 * @param assets Required. Asset objects that are evaluated for notarization, and if they do require notarization then fetch signatures via fetchNotarizationFromEndPoint()
 * @returns Map of NotarAsset
 */
export function getAssetsRequiringNotarization (psbt: Psbt, assets: Map<string, NotaryAsset>): Map<string, NotaryAsset> {
    if (!assets || !syscointx.utils.isAssetAllocationTx(psbt.version)) {
      return new Map()
    }
    const assetsInTx = syscointx.getAssetsFromOutputs(psbt.txOutputs)
    let foundNotary = false
    const assetsUsedInTxNeedingNotarization = new Map()
    assetsInTx.forEach((value: any, baseAssetID: string) => {
      if (assetsUsedInTxNeedingNotarization.has(baseAssetID)) {
        return new Map()
      }
      if (!assets.has(baseAssetID)) {
        console.log('Asset input not found in the UTXO assets map!')
        return new Map()
      }
      const valueAssetObj = assets.get(baseAssetID)
      if (valueAssetObj.notarydetails && valueAssetObj.notarydetails.endpoint && valueAssetObj.notarydetails.endpoint.length > 0) {
        assetsUsedInTxNeedingNotarization.set(baseAssetID, valueAssetObj)
        foundNotary = true
      }
    })

    return foundNotary ? assetsUsedInTxNeedingNotarization : new Map()
}

  export default getAssetsRequiringNotarization;