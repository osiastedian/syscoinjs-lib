import { Network, Psbt } from 'bitcoinjs-lib'
import signPSBTWithWIF from './signPSBTWithWIF'

/**
 * Purpose: Sign Result object with WiF
 * @param psbt Required. The resulting object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
 * @param wif Required. Private key in WIF format to sign inputs with, can be array of keys
 * @param network Required. bitcoinjs-lib Network object
 * @returns psbt from bitcoinjs-lib
 */
export async function signWithWIF(
  psbtVal: Psbt,
  wif: string,
  network: Network
): Promise<Psbt> {
  let psbt = psbtVal

  if (Array.isArray(wif)) {
    /* eslint-disable no-await-in-loop */
    /* eslint-disable no-restricted-syntax */
    for (const wifKey of wif) {
      psbt = await signPSBTWithWIF(psbt, wifKey, network)
    }
    return psbt
  }
  return signPSBTWithWIF(psbt, wif, network)
}

export default signWithWIF
