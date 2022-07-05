import axios from 'axios'
import fetchBackendAccount from './fetchBackendAccount'
import Signer from '../Signer'

/**
 * Purpose: Send raw transaction to backend Blockbook provider to send to the network
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param txHex Required. Raw transaction hex
 * @param mySignerObj Optional. Signer object if you wish to update change/receiving indexes from backend provider through fetchBackendAccount()
 * @returns Returns txid in response or error
 */
export async function sendRawTransaction(
  backendURL: string,
  txHex: string,
  mySignerObj?: Signer
): Promise<string> {
  try {
    let blockbookURL = backendURL.slice()
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, '')
    }
    const request = await axios.post(`${blockbookURL}/api/v2/sendtx/`, txHex)
    if (request && request.data) {
      if (mySignerObj) {
        await fetchBackendAccount(
          blockbookURL,
          mySignerObj.getAccountXpub(),
          'tokens=used&details=tokens',
          true,
          mySignerObj
        )
      }
      return request.data
    }
    return null
  } catch (e) {
    return e
  }
}

export default sendRawTransaction
