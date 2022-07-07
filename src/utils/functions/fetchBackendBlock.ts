import axios from 'axios'
import { BlockBookBlock } from '../../types/blockbook-block'

/**
 * Purpose: Get block from backend
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param blockhash Required.
 * @returns JSON object in response, block object in JSON
 */
export async function fetchBackendBlock(
  backendURL: string,
  blockhash: string
): Promise<BlockBookBlock> {
  try {
    let blockbookURL = backendURL.slice()
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, '')
    }
    const request = await axios.get<BlockBookBlock>(
      `${blockbookURL}/api/v2/block/${blockhash}`
    )
    if (request && request.data) {
      return request.data
    }
    return null
  } catch (e) {
    return e
  }
}

export default fetchBackendBlock
