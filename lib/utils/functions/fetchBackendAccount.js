var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from "axios";
/**
 * Fetch address or XPUB information including transactions and balance information (based on options) from backend Blockbook provider
 * @param backendURL: Required. Fully qualified URL for blockbook
 * @param addressOrXpub: Required. An address or XPUB to fetch UTXO's for
 * @param options: Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-xpub
 * @param xpub: Optional. If addressOrXpub is an XPUB set to true.
 * @param mySignerObj: Optional. Signer object if you wish to update change/receiving indexes from backend provider (and XPUB token information is provided in response)
 * @returns: Returns JSON object in response, account object in JSON
 */
export function fetchBackendAccount(backendURL, addressOrXpub, options, xpub, mySignerObj) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let blockbookURL = backendURL.slice();
            if (blockbookURL) {
                blockbookURL = blockbookURL.replace(/\/$/, "");
            }
            let url = blockbookURL;
            if (xpub) {
                url += "/api/v2/xpub/";
            }
            else {
                url += "/api/v2/address/";
            }
            url += addressOrXpub;
            if (options) {
                url += "?" + options;
            }
            const request = yield axios.get(url);
            if (request && request.data) {
                // if fetching xpub data
                if (xpub && request.data.tokens && mySignerObj) {
                    mySignerObj.setLatestIndexesFromXPubTokens(request.data.tokens);
                }
                return request.data;
            }
            return null;
        }
        catch (e) {
            console.log("Exception: " + e.message);
            return null;
        }
    });
}
export default fetchBackendAccount;
//# sourceMappingURL=fetchBackendAccount.js.map