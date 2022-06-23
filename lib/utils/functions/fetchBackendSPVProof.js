/**
 * Fetch SPV Proof from backend Blockbook provider. To be used to create a proof for the NEVM bridge.
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param addressOrXpub Required. An address or XPUB to fetch UTXO's for
 * @param options Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-utxo
 * @returns Returns JSON object in response, UTXO object array in JSON
 */
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
export function fetchBackendSPVProof(backendURL, txid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let blockbookURL = backendURL.slice();
            if (blockbookURL) {
                blockbookURL = blockbookURL.replace(/\/$/, "");
            }
            const url = blockbookURL + "/api/v2/getspvproof/" + txid;
            const request = yield axios.get(url);
            if (request && request.data) {
                return request.data;
            }
            return null;
        }
        catch (e) {
            return e;
        }
    });
}
export default fetchBackendSPVProof;
//# sourceMappingURL=fetchBackendSPVProof.js.map