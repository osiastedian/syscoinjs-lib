import axios from 'axios'
import { BlockbookTransaction } from '../../types/blockboox-tx'

/**
 * Get transaction from txid from backend Blockbook provider
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param txid Required. Transaction ID to get information for
 * @returns Returns JSON object in response, transaction object in JSON
 */
export async function fetchBackendRawTx (backendURL: string, txid: string): Promise<BlockbookTransaction> {
    try {
      let blockbookURL = backendURL.slice()
      if (blockbookURL) {
        blockbookURL = blockbookURL.replace(/\/$/, '')
      }
      const request = await axios.get(blockbookURL + '/api/v2/tx/' + txid)
      if (request && request.data) {
        return request.data
      }
      return null
    } catch (e) {
      return e
    }
  }
  
  export default fetchBackendRawTx;