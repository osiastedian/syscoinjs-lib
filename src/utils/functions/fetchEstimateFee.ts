import axios from 'axios'

interface EstimateResult {
  result: string
}

/**
 * Returns: Returns JSON object in response, fee object in JSON
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param blocks Required. How many blocks to estimate fee for.
 * @param options Optional. possible value conservative=true or false for conservative fee. Default is true.
 * @returns Returns: Returns fee response in integer. Fee rate in satoshi per kilobytes.
 */
export async function fetchEstimateFee(
  backendURL: string,
  blocks: number,
  options?: string
): Promise<number> {
  try {
    let blockbookURL = backendURL.slice()
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, '')
    }
    let url = `${blockbookURL}/api/v2/estimatefee/${blocks}`
    if (options) {
      url += `?${options}`
    }
    const request = await axios.get<EstimateResult>(url)
    if (request && request.data && request.data.result) {
      let feeInt = parseInt(request.data.result, 10)
      // if fee is 0 it usually means not enough data, so use min relay fee which is 1000 satoshi per kb in Core by default
      if (feeInt <= 0) {
        feeInt = 1000
      }
      return feeInt
    }
    return null
  } catch (e) {
    return e
  }
}

export default fetchEstimateFee
