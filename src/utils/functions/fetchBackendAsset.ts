import axios from "axios";
import { Asset, AssetInformation } from "../../types/asset-information";

/**
 * Fetch asset information from backend Blockbook provider
 * @param {string} backendURL Required. Fully qualified URL for blockbook
 * @param {string}  assetGuid Required. Asset to fetch
 * @returns {Promise<Asset>}
 */
export async function fetchBackendAsset(
  backendURL: string,
  assetGuid: string
): Promise<Asset> {
  try {
    let blockbookURL = backendURL.slice();
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, "");
    }
    const request = await axios.get<AssetInformation>(
      blockbookURL + "/api/v2/asset/" + assetGuid + "?details=basic"
    );
    if (request && request.data && request.data.asset) {
      return request.data.asset;
    }
    return null;
  } catch (e) {
    return e;
  }
}

export default fetchBackendAsset;
