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
 * Fetch asset information from backend Blockbook provider
 * @param {string} backendURL Required. Fully qualified URL for blockbook
 * @param {string}  assetGuid Required. Asset to fetch
 * @returns {Promise<Asset>}
 */
export function fetchBackendAsset(backendURL, assetGuid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let blockbookURL = backendURL.slice();
            if (blockbookURL) {
                blockbookURL = blockbookURL.replace(/\/$/, "");
            }
            const request = yield axios.get(blockbookURL + "/api/v2/asset/" + assetGuid + "?details=basic");
            if (request && request.data && request.data.asset) {
                return request.data.asset;
            }
            return null;
        }
        catch (e) {
            return e;
        }
    });
}
export default fetchBackendAsset;
//# sourceMappingURL=fetchBackendAsset.js.map