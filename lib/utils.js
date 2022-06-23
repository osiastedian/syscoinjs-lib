"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBackendSPVProof = exports.fetchBackendListAssets = exports.fetchBackendAsset = exports.fetchNotarizationFromEndPoint = exports.bitcoinSLIP44 = exports.syscoinSLIP44 = exports.syscoinXPubTypes = exports.syscoinZPubTypes = exports.bitcoinXPubTypes = exports.bitcoinZPubTypes = exports.syscoinNetworks = exports.bitcoinNetworks = void 0;
var bn_js_1 = __importDefault(require("bn.js"));
var bitcoinjs_lib_1 = __importDefault(require("bitcoinjs-lib"));
var axios_1 = __importDefault(require("axios"));
exports.bitcoinNetworks = {
    mainnet: bitcoinjs_lib_1.default.networks.bitcoin,
    testnet: bitcoinjs_lib_1.default.networks.testnet,
};
/* global localStorage */
exports.syscoinNetworks = {
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
exports.bitcoinZPubTypes = {
    mainnet: { zprv: "04b2430c", zpub: "04b24746" },
    testnet: { vprv: "045f18bc", vpub: "045f1cf6" },
};
exports.bitcoinXPubTypes = {
    mainnet: {
        zprv: exports.bitcoinNetworks.mainnet.bip32.private,
        zpub: exports.bitcoinNetworks.mainnet.bip32.public,
    },
    testnet: {
        vprv: exports.bitcoinNetworks.testnet.bip32.private,
        vpub: exports.bitcoinNetworks.testnet.bip32.public,
    },
};
exports.syscoinZPubTypes = {
    mainnet: { zprv: "04b2430c", zpub: "04b24746" },
    testnet: { vprv: "045f18bc", vpub: "045f1cf6" },
};
exports.syscoinXPubTypes = {
    mainnet: {
        zprv: exports.syscoinNetworks.mainnet.bip32.private,
        zpub: exports.syscoinNetworks.mainnet.bip32.public,
    },
    testnet: {
        vprv: exports.syscoinNetworks.testnet.bip32.private,
        vpub: exports.syscoinNetworks.testnet.bip32.public,
    },
};
exports.syscoinSLIP44 = 57;
exports.bitcoinSLIP44 = 0;
var trezorInitialized = false;
var DEFAULT_TREZOR_DOMAIN = "https://connect.trezor.io/8/";
var ERC20Manager = "0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1";
var tokenFreezeFunction = "7ca654cf9212e4c3cf0164a529dd6159fc71113f867d0b09fdeb10aa65780732"; // token freeze function signature
/**
 * Fetch notarization signature via axois from an endPoint URL, see spec for more info: https://github.com/syscoin/sips/blob/master/sip-0002.mediawiki
 * @param endPoint Required. Fully qualified URL which will take transaction information and respond with a signature or error on denial
 * @param txHex Required. Raw transaction hex
 * @returns Returns JSON object in response, signature on success and error on denial of notarization
 */
function fetchNotarizationFromEndPoint(endPoint, txHex) {
    return __awaiter(this, void 0, void 0, function () {
        var request, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios_1.default.post(endPoint, { tx: txHex })];
                case 1:
                    request = _a.sent();
                    if (request && request.data) {
                        return [2 /*return*/, request.data];
                    }
                    return [2 /*return*/, null];
                case 2:
                    e_1 = _a.sent();
                    return [2 /*return*/, e_1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.fetchNotarizationFromEndPoint = fetchNotarizationFromEndPoint;
/**
 * Fetch asset information from backend Blockbook provider
 * @param {string} backendURL Required. Fully qualified URL for blockbook
 * @param {string}  assetGuid Required. Asset to fetch
 * @returns {Promise<Asset>}
 */
function fetchBackendAsset(backendURL, assetGuid) {
    return __awaiter(this, void 0, void 0, function () {
        var blockbookURL, request, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    blockbookURL = backendURL.slice();
                    if (blockbookURL) {
                        blockbookURL = blockbookURL.replace(/\/$/, "");
                    }
                    return [4 /*yield*/, axios_1.default.get(blockbookURL + "/api/v2/asset/" + assetGuid + "?details=basic")];
                case 1:
                    request = _a.sent();
                    if (request && request.data && request.data.asset) {
                        return [2 /*return*/, request.data.asset];
                    }
                    return [2 /*return*/, null];
                case 2:
                    e_2 = _a.sent();
                    return [2 /*return*/, e_2];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.fetchBackendAsset = fetchBackendAsset;
/**
 * Fetch list of assets from backend Blockbook provider via a filter
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param filter Required. Asset to fetch via filter, will filter contract or symbol fields
 * @returns Returns JSON array in response, asset information objects in JSON
 */
function fetchBackendListAssets(backendURL, filter) {
    return __awaiter(this, void 0, void 0, function () {
        var blockbookURL, request, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    blockbookURL = backendURL.slice();
                    if (blockbookURL) {
                        blockbookURL = blockbookURL.replace(/\/$/, "");
                    }
                    return [4 /*yield*/, axios_1.default.get(blockbookURL + "/api/v2/assets/" + filter)];
                case 1:
                    request = _a.sent();
                    if (request && request.data && request.data.assets) {
                        return [2 /*return*/, request.data.assets];
                    }
                    return [2 /*return*/, null];
                case 2:
                    e_3 = _a.sent();
                    return [2 /*return*/, e_3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.fetchBackendListAssets = fetchBackendListAssets;
/**
 * Fetch SPV Proof from backend Blockbook provider. To be used to create a proof for the NEVM bridge.
 * @param backendURL Required. Fully qualified URL for blockbook
 * @param addressOrXpub Required. An address or XPUB to fetch UTXO's for
 * @param options Optional. Optional queries based on https://github.com/syscoin/blockbook/blob/master/docs/api.md#get-utxo
 * @returns Returns JSON object in response, UTXO object array in JSON
 */
function fetchBackendSPVProof(backendURL, txid) {
    return __awaiter(this, void 0, void 0, function () {
        var blockbookURL, url, request, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    blockbookURL = backendURL.slice();
                    if (blockbookURL) {
                        blockbookURL = blockbookURL.replace(/\/$/, "");
                    }
                    url = blockbookURL + "/api/v2/getspvproof/" + txid;
                    return [4 /*yield*/, axios_1.default.get(url)];
                case 1:
                    request = _a.sent();
                    if (request && request.data) {
                        return [2 /*return*/, request.data];
                    }
                    return [2 /*return*/, null];
                case 2:
                    e_4 = _a.sent();
                    return [2 /*return*/, e_4];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.fetchBackendSPVProof = fetchBackendSPVProof;
exports.default = {
    BN: bn_js_1.default,
};
//# sourceMappingURL=utils.js.map