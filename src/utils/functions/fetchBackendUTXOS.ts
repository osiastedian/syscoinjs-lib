import axios from 'axios'
import { UTXO } from '../../types/utxo-object'

/**
 * Fetch UTXO's for an address or XPUB from backend Blockbook provider
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param addressOrXpub Required. An address or XPUB to fetch UTXO's for
 * @param options Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-utxo
 * @returns JSON object in response, UTXO object array in JSON
 */
export async function fetchBackendUTXOS(
  backendURL: string,
  addressOrXpub: string,
  options?: string
): Promise<UTXO[]> {
  try {
    let blockbookURL = backendURL.slice()
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, '')
    }
    let url = `${blockbookURL}/api/v2/utxo/${addressOrXpub}`
    if (options) {
      url += `?${options}`
    }
    const request = await axios.get(url)
    if (request && request.data) {
      request.data.addressOrXpub = addressOrXpub
      return request.data
    }
    return null
  } catch (e) {
    return e
  }
}

export default fetchBackendUTXOS
