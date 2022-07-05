/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import { NotaryAsset } from '../../types/notary-details'
import fetchNotarizationFromEndPoint from './fetchNotarizationFromEndPoint'

/**
 * Get notarization signatures from a notary endpoint defined in the asset object, see spec for more info: https://github.com/syscoin/sips/blob/master/sip-0002.mediawiki
 * @param notaryAssets Required. Asset objects that require notarization, fetch signatures via fetchNotarizationFromEndPoint()
 * @param txHex Required. Signed transaction hex created from syscointx.createTransaction()/syscointx.createAssetTransaction()
 * @returns boolean representing if notarization was done by acquiring a witness signature from notary.
 */
export async function getNotarizationSignatures(
  notaryAssets: Map<string, NotaryAsset>,
  txHex: string
): Promise<boolean> {
  let notarizationDone = false
  if (!notaryAssets) {
    return notarizationDone
  }
  for (const valueAssetObj of notaryAssets.values()) {
    if (!valueAssetObj.notarydetails || !valueAssetObj.notarydetails.endpoint) {
      console.log(
        `getNotarizationSignatures: Invalid notary details: ${JSON.stringify(
          valueAssetObj
        )}`
      )
      continue
    }
    if (valueAssetObj.notarydone) {
      continue
    }
    if (
      valueAssetObj.notarydetails.endpoint.toString() === 'https://test.com'
    ) {
      return false
    }
    const responseNotary = await fetchNotarizationFromEndPoint(
      valueAssetObj.notarydetails.endpoint.toString(),
      txHex
    )
    if (!responseNotary) {
      throw Object.assign(new Error('No response from notary'), { code: 402 })
    } else if (responseNotary.error) {
      throw Object.assign(new Error(responseNotary.error), { code: 402 })
    } else if (responseNotary.sigs) {
      for (let i = 0; i < responseNotary.sigs.length; i++) {
        const sigObj = responseNotary.sigs[i]
        const notarysig = Buffer.from(sigObj.sig, 'base64')
        const notaryAssetObj = notaryAssets.get(sigObj.asset)
        if (notaryAssetObj && notarysig.length === 65) {
          notaryAssetObj.notarysig = notarysig
          notaryAssetObj.notarydone = true
          notarizationDone = true
        }
      }
    } else {
      throw Object.assign(responseNotary, { code: 402 })
    }
  }
  return notarizationDone
}

export default getNotarizationSignatures
