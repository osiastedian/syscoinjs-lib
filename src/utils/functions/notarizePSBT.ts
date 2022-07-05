import { Psbt } from 'bitcoinjs-lib'
import syscointx from 'syscointx-js'
import { NotaryAsset } from '../../types/notary-details'
import getNotarizationSignatures from './getNotarizationSignatures'

/**
 * Purpose: Notarize Result object from syscointx.createTransaction()/syscointx.createAssetTransaction() if required by the assets in the inputs of the transaction
 * @param psbt Required. The resulting PSBT object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
 * @param notaryAssets Required. Asset objects require notarization, fetch signatures via fetchNotarizationFromEndPoint()
 * @param rawTx Required. Transaction hex
 * @returns
 */
export async function notarizePSBT(
  psbt: Psbt,
  notaryAssets: Map<string, NotaryAsset>,
  rawTx: string
): Promise<{ output: any; index: number } | boolean> {
  const notarizationDone = await getNotarizationSignatures(notaryAssets, rawTx)
  if (notarizationDone) {
    return syscointx.addNotarizationSignatures(
      psbt.version,
      notaryAssets,
      psbt.txOutputs
    )
  }
  return false
}

export default notarizePSBT
