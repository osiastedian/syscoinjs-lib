/**
 * Fetch SPV Proof from backend Blockbook provider. To be used to create a proof for the NEVM bridge.
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param addressOrXpub Required. An address or XPUB to fetch UTXO's for
 * @param options Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-utxo
 * @returns Returns JSON object in response, UTXO object array in JSON
 */
export declare function fetchBackendSPVProof(backendURL: string, txid: string): Promise<any>;
export default fetchBackendSPVProof;
