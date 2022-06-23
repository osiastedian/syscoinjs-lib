import axios from "axios";
import Signer from "../Signer";
/**
 * Fetch address or XPUB information including transactions and balance information (based on options) from backend Blockbook provider
 * @param backendURL: Required. Fully qualified URL for blockbook
 * @param addressOrXpub: Required. An address or XPUB to fetch UTXO's for
 * @param options: Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-xpub
 * @param xpub: Optional. If addressOrXpub is an XPUB set to true.
 * @param mySignerObj: Optional. Signer object if you wish to update change/receiving indexes from backend provider (and XPUB token information is provided in response)
 * @returns: Returns JSON object in response, account object in JSON
 */
export async function fetchBackendAccount(
  backendURL: string,
  addressOrXpub: string,
  options?: string,
  xpub?: boolean,
  mySignerObj?: Signer
) {
  try {
    let blockbookURL = backendURL.slice();
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, "");
    }
    let url = blockbookURL;
    if (xpub) {
      url += "/api/v2/xpub/";
    } else {
      url += "/api/v2/address/";
    }
    url += addressOrXpub;
    if (options) {
      url += "?" + options;
    }
    const request = await axios.get(url);
    if (request && request.data) {
      // if fetching xpub data
      if (xpub && request.data.tokens && mySignerObj) {
        mySignerObj.setLatestIndexesFromXPubTokens(request.data.tokens);
      }
      return request.data;
    }
    return null;
  } catch (e) {
    console.log("Exception: " + e.message);
    return null;
  }
}

export default fetchBackendAccount;
