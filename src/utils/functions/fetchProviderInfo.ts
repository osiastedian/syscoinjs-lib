import axios from 'axios'
import { BlockbookProviderInfo } from '../../types/blockbook-info'

/**
 * Get prover info including blockbook and backend data
 * @param backendURL Required. Fully qualified URL for blockbook
 * @returns JSON object in response, provider object in JSON
 */
export async function fetchProviderInfo(
  backendURL: string
): Promise<BlockbookProviderInfo> {
  try {
    let blockbookURL = backendURL.slice()
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, '')
    }
    const request = await axios.get<BlockbookProviderInfo>(
      `${blockbookURL}/api/v2`
    )
    if (request && request.data) {
      return request.data
    }
    return null
  } catch (e) {
    return e
  }
}

export default fetchProviderInfo
