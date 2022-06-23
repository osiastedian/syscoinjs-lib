import BN from "bn.js";
import bjs from "bitcoinjs-lib";
import axios from "axios";
import { Asset, AssetInformation, AssetPage } from "./types/asset-information";

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
const tokenFreezeFunction =
  "7ca654cf9212e4c3cf0164a529dd6159fc71113f867d0b09fdeb10aa65780732"; // token freeze function signature

/**
 * Fetch notarization signature via axois from an endPoint URL, see spec for more info: https://github.com/syscoin/sips/blob/master/sip-0002.mediawiki
 * @param endPoint Required. Fully qualified URL which will take transaction information and respond with a signature or error on denial
 * @param txHex Required. Raw transaction hex
 * @returns Returns JSON object in response, signature on success and error on denial of notarization
 */
export async function fetchNotarizationFromEndPoint(
  endPoint: string,
  txHex: string
) {
  try {
    const request = await axios.post(endPoint, { tx: txHex });
    if (request && request.data) {
      return request.data;
    }
    return null;
  } catch (e) {
    return e;
  }
}

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

/**
 * Fetch SPV Proof from backend Blockbook provider. To be used to create a proof for the NEVM bridge.
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param addressOrXpub Required. An address or XPUB to fetch UTXO's for
 * @param options Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-utxo
 * @returns Returns JSON object in response, UTXO object array in JSON
 */

export async function fetchBackendSPVProof(backendURL: string, txid: string) {
  try {
    let blockbookURL = backendURL.slice();
    if (blockbookURL) {
      blockbookURL = blockbookURL.replace(/\/$/, "");
    }
    const url = blockbookURL + "/api/v2/getspvproof/" + txid;
    const request = await axios.get(url);
    if (request && request.data) {
      return request.data;
    }
    return null;
  } catch (e) {
    return e;
  }
}

export default {
  BN,
};
