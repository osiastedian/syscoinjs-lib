var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { bitcoinZPubTypes, syscoinNetworks, syscoinZPubTypes } from "../utils";
import fetchBackendAccount from "./functions/fetchBackendAccount";
import bjs from "bitcoinjs-lib";
export class Signer {
    constructor(password, isTestnet, networks, slip44, pubtypes) {
        this.accounts = [];
        this.changeIndex = -1;
        this.receivingIndex = -1;
        this.accountIndex = 0;
        this.setIndexFlag = 0;
        this.password = password;
        this.isTestnet = isTestnet || false;
        this.networks = networks || syscoinNetworks;
        this.SLIP44 = slip44;
        this.network = this.networks.testnet || syscoinNetworks.testnet;
        if (!this.isTestnet) {
            this.network = this.networks.mainnet || syscoinNetworks.mainnet;
        }
        this.pubTypes = pubtypes || syscoinZPubTypes;
    }
    /**
     * Set HD account based on accountIndex number passed in so HD indexes (change/receiving) will be updated accordingly to this account
     * @param index: Required. Account number to use
     */
    setAccountIndex(index) {
        if (index > this.accounts.length) {
            console.log("Account does not exist, use createAccount to create it first...");
            return;
        }
        if (this.accountIndex === index) {
            return;
        }
        this.changeIndex = -1;
        this.receivingIndex = -1;
        this.accountIndex = index;
    }
    /**
     * Get new address for sending change to
     * @param skipIncrement Optional. If we should not count the internal change index counter (if you want to get the same change address in the future)
     * @returns address used for change outputs
     */
    getNewChangeAddress(skipIncrement) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.changeIndex === -1 && this.blockbookURL) {
                let res = yield fetchBackendAccount(this.blockbookURL, this.getAccountXpub(), "tokens=used&details=tokens", true, this);
                if (res === null) {
                    // try once more in case it fails for some reason
                    res = yield fetchBackendAccount(this.blockbookURL, this.getAccountXpub(), "tokens=used&details=tokens", true, this);
                    if (res === null) {
                        throw new Error("Could not update XPUB change index");
                    }
                }
            }
            const address = this.createAddress(this.changeIndex + 1, true);
            if (address) {
                if (!skipIncrement) {
                    this.changeIndex++;
                }
                return address;
            }
            return null;
        });
    }
    /**
     * Get new address for sending coins to
     * @param skipIncrement Optional. If we should not count the internal receiving index counter (if you want to get the same address in the future)
     * @returns address used for receiving outputs
     */
    getNewReceivingAddress(skipIncrement) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.receivingIndex === -1 && this.blockbookURL) {
                let res = yield fetchBackendAccount(this.blockbookURL, this.getAccountXpub(), "tokens=used&details=tokens", true, this);
                if (res === null) {
                    // try once more in case it fails for some reason
                    res = yield fetchBackendAccount(this.blockbookURL, this.getAccountXpub(), "tokens=used&details=tokens", true, this);
                    if (res === null) {
                        throw new Error("Could not update XPUB receiving index");
                    }
                }
            }
            const address = this.createAddress(this.receivingIndex + 1, false);
            if (address) {
                if (!skipIncrement) {
                    this.receivingIndex++;
                }
                return address;
            }
            return null;
        });
    }
    /**
     * Get XPUB for account, useful for public provider lookups based on XPUB accounts
     * @returns: string representing hex XPUB
     */
    getAccountXpub() {
        return this.accounts[this.accountIndex].getAccountPublicKey();
    }
    /**
     * Sets the change and receiving indexes from XPUB tokens passed in, from a backend provider response
     * @param tokens Required. XPUB tokens from provider response to XPUB account details
     */
    setLatestIndexesFromXPubTokens(tokens) {
        this.setIndexFlag++;
        if (this.setIndexFlag > 1 && this.setIndexFlag < 100) {
            return;
        }
        if (tokens) {
            tokens.forEach((token) => {
                if (!token.transfers || !token.path) {
                    return;
                }
                const transfers = typeof token.transfers === "string"
                    ? parseInt(token.transfers, 10)
                    : token.transfers;
                if (token.path && transfers > 0) {
                    const splitPath = token.path.split("/");
                    if (splitPath.length >= 6) {
                        const change = parseInt(splitPath[4], 10);
                        const index = parseInt(splitPath[5], 10);
                        if (change === 1) {
                            if (index > this.changeIndex) {
                                this.changeIndex = index;
                            }
                        }
                        else if (index > this.receivingIndex) {
                            this.receivingIndex = index;
                        }
                    }
                }
            });
        }
        this.setIndexFlag = 0;
    }
    createAddress(addressIndex, isChange) {
        let bipNum = 44;
        if (this.pubTypes === syscoinZPubTypes ||
            this.pubTypes === bitcoinZPubTypes) {
            bipNum = 84;
        }
        return this.accounts[this.accountIndex].getAddress(addressIndex, isChange, bipNum);
    }
    /**
     *
     * @param addressIndex Optional. HT Path address index. If not provided uses the stored change/recv indexes for the last path prefix
     * @param isChange Optional. HD Path change parker
     */
    getHDPath(addressIndex, isChange) {
        const changeNum = isChange ? "1" : "0";
        let bipNum = 44;
        if (this.pubTypes === syscoinZPubTypes ||
            this.pubTypes === bitcoinZPubTypes) {
            bipNum = 84;
        }
        let recvIndex = isChange ? this.changeIndex : this.receivingIndex;
        if (addressIndex) {
            recvIndex = addressIndex;
        }
        return `m/${bipNum}'/${this.SLIP44}'/${this.accountIndex}'/${changeNum}/${recvIndex}`;
    }
    /**
     * Takes pubkey and gives back a p2wpkh address
     * @param pubkey: Required. bitcoinjs-lib public key
     * @returns: p2wpkh address
     */
    getAddressFromPubKey(pubkey) {
        const payment = bjs.payments.p2wpkh({
            pubkey: pubkey,
            network: this.network,
        });
        return payment.address;
    }
}
export default Signer;
//# sourceMappingURL=Signer.js.map