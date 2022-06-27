import axios from 'axios'

/**
 * Fetch notarization signature via axois from an endPoint URL, see spec for more info: https://github.com/syscoin/sips/blob/master/sip-0002.mediawiki
 * @param endPoint Required. Fully qualified URL which will take transaction information and respond with a signature or error on denial
 * @param txHex Required. Raw transaction hex
 * @returns Returns JSON object in response, signature on success and error on denial of notarization
 */
export async function fetchNotarizationFromEndPoint(
  endPoint: string,
  txHex: string
) {
  try {
    const request = await axios.post(endPoint, { tx: txHex })
    if (request && request.data) {
      return request.data
    }
    return null
  } catch (e) {
    return e
  }
}

export default fetchNotarizationFromEndPoint
