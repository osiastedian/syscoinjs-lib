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
 * Fetch notarization signature via axois from an endPoint URL, see spec for more info: https://github.com/syscoin/sips/blob/master/sip-0002.mediawiki
 * @param endPoint Required. Fully qualified URL which will take transaction information and respond with a signature or error on denial
 * @param txHex Required. Raw transaction hex
 * @returns Returns JSON object in response, signature on success and error on denial of notarization
 */
export function fetchNotarizationFromEndPoint(endPoint, txHex) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const request = yield axios.post(endPoint, { tx: txHex });
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
export default fetchNotarizationFromEndPoint;
//# sourceMappingURL=fetchNotarizationFromEndPoint.js.map