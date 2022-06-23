import { Asset } from "../../types/asset-information";
/**
 * Fetch asset information from backend Blockbook provider
 * @param {string} backendURL Required. Fully qualified URL for blockbook
 * @param {string}  assetGuid Required. Asset to fetch
 * @returns {Promise<Asset>}
 */
export declare function fetchBackendAsset(backendURL: string, assetGuid: string): Promise<Asset>;
export default fetchBackendAsset;
