import BN from "bn.js";
import bjs from "bitcoinjs-lib";
import { Asset } from "./types/asset-information";
export declare const bitcoinNetworks: {
    mainnet: bjs.networks.Network;
    testnet: bjs.networks.Network;
};
export declare const syscoinNetworks: {
    mainnet: {
        messagePrefix: string;
        bech32: string;
        bip32: {
            public: number;
            private: number;
        };
        pubKeyHash: number;
        scriptHash: number;
        wif: number;
    };
    testnet: {
        messagePrefix: string;
        bech32: string;
        bip32: {
            public: number;
            private: number;
        };
        pubKeyHash: number;
        scriptHash: number;
        wif: number;
    };
};
export declare const bitcoinZPubTypes: {
    mainnet: {
        zprv: string;
        zpub: string;
    };
    testnet: {
        vprv: string;
        vpub: string;
    };
};
export declare const bitcoinXPubTypes: {
    mainnet: {
        zprv: number;
        zpub: number;
    };
    testnet: {
        vprv: number;
        vpub: number;
    };
};
export declare const syscoinZPubTypes: {
    mainnet: {
        zprv: string;
        zpub: string;
    };
    testnet: {
        vprv: string;
        vpub: string;
    };
};
export declare const syscoinXPubTypes: {
    mainnet: {
        zprv: number;
        zpub: number;
    };
    testnet: {
        vprv: number;
        vpub: number;
    };
};
export declare const syscoinSLIP44 = 57;
export declare const bitcoinSLIP44 = 0;
/**
 * Fetch notarization signature via axois from an endPoint URL, see spec for more info: https://github.com/syscoin/sips/blob/master/sip-0002.mediawiki
 * @param endPoint Required. Fully qualified URL which will take transaction information and respond with a signature or error on denial
 * @param txHex Required. Raw transaction hex
 * @returns Returns JSON object in response, signature on success and error on denial of notarization
 */
export declare function fetchNotarizationFromEndPoint(endPoint: string, txHex: string): Promise<any>;
/**
 * Fetch asset information from backend Blockbook provider
 * @param {string} backendURL Required. Fully qualified URL for blockbook
 * @param {string}  assetGuid Required. Asset to fetch
 * @returns {Promise<Asset>}
 */
export declare function fetchBackendAsset(backendURL: string, assetGuid: string): Promise<Asset>;
/**
 * Fetch list of assets from backend Blockbook provider via a filter
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param filter Required. Asset to fetch via filter, will filter contract or symbol fields
 * @returns Returns JSON array in response, asset information objects in JSON
 */
export declare function fetchBackendListAssets(backendURL: string, filter: string): Promise<Asset[]>;
/**
 * Fetch SPV Proof from backend Blockbook provider. To be used to create a proof for the NEVM bridge.
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param addressOrXpub Required. An address or XPUB to fetch UTXO's for
 * @param options Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-utxo
 * @returns Returns JSON object in response, UTXO object array in JSON
 */
export declare function fetchBackendSPVProof(backendURL: string, txid: string): Promise<any>;
declare const _default: {
    BN: typeof BN;
};
export default _default;
