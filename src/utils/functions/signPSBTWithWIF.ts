import bjs, { Network, Psbt } from 'bitcoinjs-lib'

/**
 * Purpose: Sign PSBT with WiF
 * @param psbt Required. Partially signed transaction object
 * @param wif Required. Private key in WIF format to sign inputs with
 * @param network Required. bitcoinjs-lib Network object
 * @returns psbt from bitcoinjs-lib
 */
export async function signPSBTWithWIF(
  psbt: Psbt,
  wif: string,
  network: Network
): Promise<Psbt> {
  const wifObject = bjs.ECPair.fromWIF(wif, network)
  // sign inputs with wif
  await psbt.signAllInputsAsync(wifObject)
  try {
    if (psbt.validateSignaturesOfAllInputs()) {
      psbt.finalizeAllInputs()
    }
  } catch (err) {}
  return psbt
}

export default signPSBTWithWIF
