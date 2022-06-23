import { Asset } from "../../types/asset-information";
/**
 * Fetch list of assets from backend Blockbook provider via a filter
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param filter Required. Asset to fetch via filter, will filter contract or symbol fields
 * @returns Returns JSON array in response, asset information objects in JSON
 */
export declare function fetchBackendListAssets(backendURL: string, filter: string): Promise<Asset[]>;
export default fetchBackendListAssets;
