/// <reference types="node" />
import { PubTypes } from "../types/pubtype";
import { fromZPrv, fromZPub } from "bip84";
import { XPUBToken } from "../types/xpub-token";
import { Network } from "bitcoinjs-lib";
import { Networks } from "../types/network";
export declare type Account = fromZPrv | fromZPub;
export declare class Signer {
    password: string;
    isTestnet: boolean;
    networks: Networks;
    SLIP44: number;
    network: Network;
    pubTypes: PubTypes;
    accounts: Account[];
    changeIndex: number;
    receivingIndex: number;
    accountIndex: number;
    setIndexFlag: number;
    blockbookURL: string;
    constructor(password: string, isTestnet: boolean, networks: Networks, slip44: number, pubtypes: PubTypes);
    /**
     * Set HD account based on accountIndex number passed in so HD indexes (change/receiving) will be updated accordingly to this account
     * @param index: Required. Account number to use
     */
    setAccountIndex(index: number): void;
    /**
     * Get new address for sending change to
     * @param skipIncrement Optional. If we should not count the internal change index counter (if you want to get the same change address in the future)
     * @returns address used for change outputs
     */
    getNewChangeAddress(skipIncrement?: number): Promise<string | null>;
    /**
     * Get new address for sending coins to
     * @param skipIncrement Optional. If we should not count the internal receiving index counter (if you want to get the same address in the future)
     * @returns address used for receiving outputs
     */
    getNewReceivingAddress(skipIncrement: number): Promise<string | null>;
    /**
     * Get XPUB for account, useful for public provider lookups based on XPUB accounts
     * @returns: string representing hex XPUB
     */
    getAccountXpub(): string;
    /**
     * Sets the change and receiving indexes from XPUB tokens passed in, from a backend provider response
     * @param tokens Required. XPUB tokens from provider response to XPUB account details
     */
    setLatestIndexesFromXPubTokens(tokens: XPUBToken[]): void;
    createAddress(addressIndex: number, isChange: boolean): any;
    /**
     *
     * @param addressIndex Optional. HT Path address index. If not provided uses the stored change/recv indexes for the last path prefix
     * @param isChange Optional. HD Path change parker
     */
    getHDPath(addressIndex?: number, isChange?: boolean): string;
    /**
     * Takes pubkey and gives back a p2wpkh address
     * @param pubkey: Required. bitcoinjs-lib public key
     * @returns: p2wpkh address
     */
    getAddressFromPubKey(pubkey: Buffer): string;
}
export default Signer;
