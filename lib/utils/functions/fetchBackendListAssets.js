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
 * Fetch list of assets from backend Blockbook provider via a filter
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param filter Required. Asset to fetch via filter, will filter contract or symbol fields
 * @returns Returns JSON array in response, asset information objects in JSON
 */
export function fetchBackendListAssets(backendURL, filter) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let blockbookURL = backendURL.slice();
            if (blockbookURL) {
                blockbookURL = blockbookURL.replace(/\/$/, "");
            }
            const request = yield axios.get(blockbookURL + "/api/v2/assets/" + filter);
            if (request && request.data && request.data.assets) {
                return request.data.assets;
            }
            return null;
        }
        catch (e) {
            return e;
        }
    });
}
export default fetchBackendListAssets;
//# sourceMappingURL=fetchBackendListAssets.js.map