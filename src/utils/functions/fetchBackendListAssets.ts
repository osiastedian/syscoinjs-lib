import axios from "axios";
import { Asset, AssetPage } from "../../types/asset-information";

/**
 * Fetch list of assets from backend Blockbook provider via a filter
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param filter Required. Asset to fetch via filter, will filter contract or symbol fields
 * @returns Returns JSON array in response, asset information objects in JSON
 */
export async function fetchBackendListAssets(
  backendURL: string,
  filter: string
): Promise<Asset[]> {
  try {
    let blockbookURL = backendURL.slice();
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, "");
    }
    const request = await axios.get<AssetPage>(
      blockbookURL + "/api/v2/assets/" + filter
    );
    if (request && request.data && request.data.assets) {
      return request.data.assets;
    }
    return null;
  } catch (e) {
    return e;
  }
}

export default fetchBackendListAssets;
