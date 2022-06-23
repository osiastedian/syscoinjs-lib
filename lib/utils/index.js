import BN from "bn.js";
import bjs from "bitcoinjs-lib";
export * from "./functions/fetchNotarizationFromEndPoint";
export * from "./functions/fetchBackendAsset";
export * from "./functions/fetchBackendListAssets";
export * from "./functions/fetchBackendSPVProof";
export * from "./Signer";
export * from "./HDSigner";
export const bitcoinNetworks = {
    mainnet: bjs.networks.bitcoin,
    testnet: bjs.networks.testnet,
};
/* global localStorage */
export const syscoinNetworks = {
    mainnet: {
        messagePrefix: "\x18Syscoin Signed Message:\n",
        bech32: "sys",
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4,
        },
        pubKeyHash: 0x3f,
        scriptHash: 0x05,
        wif: 0x80,
    },
    testnet: {
        messagePrefix: "\x18Syscoin Signed Message:\n",
        bech32: "tsys",
        bip32: {
            public: 0x043587cf,
            private: 0x04358394,
        },
        pubKeyHash: 0x41,
        scriptHash: 0xc4,
        wif: 0xef,
    },
};
export const bitcoinZPubTypes = {
    mainnet: { zprv: "04b2430c", zpub: "04b24746" },
    testnet: { vprv: "045f18bc", vpub: "045f1cf6" },
};
export const bitcoinXPubTypes = {
    mainnet: {
        zprv: bitcoinNetworks.mainnet.bip32.private,
        zpub: bitcoinNetworks.mainnet.bip32.public,
    },
    testnet: {
        vprv: bitcoinNetworks.testnet.bip32.private,
        vpub: bitcoinNetworks.testnet.bip32.public,
    },
};
export const syscoinZPubTypes = {
    mainnet: { zprv: "04b2430c", zpub: "04b24746" },
    testnet: { vprv: "045f18bc", vpub: "045f1cf6" },
};
export const syscoinXPubTypes = {
    mainnet: {
        zprv: syscoinNetworks.mainnet.bip32.private,
        zpub: syscoinNetworks.mainnet.bip32.public,
    },
    testnet: {
        vprv: syscoinNetworks.testnet.bip32.private,
        vpub: syscoinNetworks.testnet.bip32.public,
    },
};
export const syscoinSLIP44 = 57;
export const bitcoinSLIP44 = 0;
let trezorInitialized = false;
const DEFAULT_TREZOR_DOMAIN = "https://connect.trezor.io/8/";
const ERC20Manager = "0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1";
const tokenFreezeFunction = "7ca654cf9212e4c3cf0164a529dd6159fc71113f867d0b09fdeb10aa65780732"; // token freeze function signature
export default {
    BN,
};
//# sourceMappingURL=index.js.map