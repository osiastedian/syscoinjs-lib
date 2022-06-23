/// <reference types="node" />
import { PubTypes } from "../types/pubtype";
import Signer, { Networks } from "./Signer";
import { fromMnemonic } from "bip84";
import { BIP32Interface, Psbt } from "bitcoinjs-lib";
export declare class HDSigner extends Signer {
    mnemonic: string;
    fromMnemonic: fromMnemonic;
    changeIndex: number;
    receivingIndex: number;
    constructor(mnemonic: string, password: string, isTestnet: boolean, networks: Networks, slip44: number, pubtypes: PubTypes);
    /**
     * Sign PSBT with XPUB information from HDSigner
     * @param psbt Required. Partially signed transaction object
     * @param pathIn Optional. Custom HD Bip32 path useful if signing from a specific address like a multisig
     * @returns psbt from bitcoinjs-lib
     */
    signPSBT(psbt: Psbt, pathIn?: string): Promise<Psbt>;
    /**
     * Create signing information based on HDSigner (if set) and call signPSBT() to actually sign, as well as detect notarization and apply it as required.
     * @param psbt: Required. PSBT object from bitcoinjs-lib
     * @returns: psbt from bitcoinjs-lib
     */
    sign(psbt: Psbt, pathIn?: string): Promise<Psbt>;
    /**
     * Get master seed fingerprint used for signing with bitcoinjs-lib PSBT's
     * @returns: bip32 root master fingerprint
     */
    getMasterFingerprint(): Buffer;
    deriveAccount(index: number): any;
    restore(password: string): boolean;
    backup(): void;
    /**
     * Takes an HD path and derives keypair from it, returns pubkey
     * @param keypath: Required. HD BIP32 path of key desired based on internal seed and network
     * @returns: bitcoinjs-lib pubkey
     */
    derivePubKey(keypath: string): Buffer;
    createAccount(): number;
    createKeyPair(addressIndex: number, isChange: boolean): any;
    /**
     * Takes keypair and gives back a p2wpkh address
     * @param keyPair: Required. bitcoinjs-lib keypair
     * @returns: string p2wpkh address
     */
    getAddressFromKeypair: (keyPair: BIP32Interface) => string;
    /**
     * Takes an HD path and derives keypair from it
     * @param keypath Required. HD BIP32 path of key desired based on internal seed and network
     * @returns bitcoinjs-lib keypair
     */
    deriveKeypair(keypath: string): BIP32Interface;
    /**
     * Returns HDSigner's BIP32 root node
     * @returns BIP32 root node representing the seed
     */
    getRootNode(): BIP32Interface;
}
export default HDSigner;
