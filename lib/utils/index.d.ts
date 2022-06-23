import BN from "bn.js";
import { Networks } from "../types/network";
export * from "./functions/fetchNotarizationFromEndPoint";
export * from "./functions/fetchBackendAsset";
export * from "./functions/fetchBackendListAssets";
export * from "./functions/fetchBackendSPVProof";
export * from "./Signer";
export * from "./HDSigner";
export declare const bitcoinNetworks: Networks;
export declare const syscoinNetworks: Networks;
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
declare const _default: {
    BN: typeof BN;
};
export default _default;
