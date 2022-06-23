import { PubTypes } from "../types/pubtype";
import Signer from "./Signer";
import { fromMnemonic, fromZPrv } from "bip84";
import CryptoJS from "crypto-js";
import { bitcoinZPubTypes, syscoinZPubTypes } from ".";
import { BIP32Interface, Psbt } from "bitcoinjs-lib";
import bjs from "bitcoinjs-lib";
import { Networks } from "../types/network";

export class HDSigner extends Signer {
  mnemonic: string;
  fromMnemonic: fromMnemonic;
  changeIndex: number;
  receivingIndex: number;
  constructor(
    mnemonic: string,
    password: string,
    isTestnet: boolean,
    networks: Networks,
    slip44: number,
    pubtypes: PubTypes
  ) {
    super(password, isTestnet, networks, slip44, pubtypes);
    this.mnemonic = mnemonic;
    this.fromMnemonic = new fromMnemonic(
      mnemonic,
      this.password,
      this.isTestnet,
      this.SLIP44,
      this.pubTypes,
      this.network
    );
    if (!this.password || !this.restore(this.password)) {
      this.createAccount();
    }
  }

  /**
   * Sign PSBT with XPUB information from HDSigner
   * @param psbt Required. Partially signed transaction object
   * @param pathIn Optional. Custom HD Bip32 path useful if signing from a specific address like a multisig
   * @returns psbt from bitcoinjs-lib
   */
  async signPSBT(psbt: Psbt, pathIn?: string) {
    const txInputs = psbt.txInputs;
    const fp = this.getMasterFingerprint();
    for (let i = 0; i < txInputs.length; i++) {
      const dataInput = psbt.data.inputs[i];
      if (
        pathIn ||
        (dataInput.unknownKeyVals &&
          dataInput.unknownKeyVals.length > 1 &&
          dataInput.unknownKeyVals[1].key.equals(Buffer.from("path")) &&
          (!dataInput.bip32Derivation ||
            dataInput.bip32Derivation.length === 0))
      ) {
        const path = pathIn || dataInput.unknownKeyVals[1].value.toString();
        const pubkey = this.derivePubKey(path);
        const address = this.getAddressFromPubKey(pubkey);
        if (
          pubkey &&
          (pathIn || dataInput.unknownKeyVals[0].value.toString() === address)
        ) {
          dataInput.bip32Derivation = [
            {
              masterFingerprint: fp,
              path: path,
              pubkey: pubkey,
            },
          ];
        }
      }
    }
    await psbt.signAllInputsHDAsync(this.getRootNode());
    try {
      if (psbt.validateSignaturesOfAllInputs()) {
        psbt.finalizeAllInputs();
      }
    } catch (err) {}
    return psbt;
  }

  /**
   * Create signing information based on HDSigner (if set) and call signPSBT() to actually sign, as well as detect notarization and apply it as required.
   * @param psbt: Required. PSBT object from bitcoinjs-lib
   * @returns: psbt from bitcoinjs-lib
   */
  async sign(psbt: Psbt, pathIn?: string) {
    return await this.signPSBT(psbt, pathIn);
  }
  /**
   * Get master seed fingerprint used for signing with bitcoinjs-lib PSBT's
   * @returns: bip32 root master fingerprint
   */
  getMasterFingerprint() {
    return bjs.bip32.fromSeed(this.fromMnemonic.seed, this.network).fingerprint;
  }

  deriveAccount(index: number) {
    let bipNum = 44;
    if (
      this.pubTypes === syscoinZPubTypes ||
      this.pubTypes === bitcoinZPubTypes
    ) {
      bipNum = 84;
    }
    return this.fromMnemonic.deriveAccount(index, bipNum);
  }

  restore(password: string): boolean {
    let browserStorage =
      typeof localStorage === "undefined" || localStorage === null
        ? null
        : localStorage;
    if (!browserStorage) {
      const LocalStorage = require("node-localstorage").LocalStorage;
      browserStorage = new LocalStorage("./scratch");
    }
    const key = this.network.bech32 + "_hdsigner";
    const ciphertext = browserStorage.getItem(key);
    if (ciphertext === null) {
      return false;
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, password);
    if (!bytes || bytes.length === 0) {
      return false;
    }
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    this.mnemonic = decryptedData.mnemonic;
    const numAccounts = decryptedData.numAccounts;
    // sanity checks
    if (this.accountIndex > 1000) {
      return false;
    }
    this.accounts = [];
    this.changeIndex = -1;
    this.receivingIndex = -1;
    this.accountIndex = 0;
    for (let i = 0; i < numAccounts; i++) {
      const child = this.deriveAccount(i);
      this.accounts.push(new fromZPrv(child, this.pubTypes, this.networks));
    }

    return true;
  }

  backup(): void {
    let browserStorage =
      typeof localStorage === "undefined" || localStorage === null
        ? null
        : localStorage;
    if (!this.password) {
      return;
    }
    if (!browserStorage) {
      const LocalStorage = require("node-localstorage").LocalStorage;
      browserStorage = new LocalStorage("./scratch");
    }
    const key = this.network.bech32 + "_hdsigner";
    const obj = {
      mnemonic: this.mnemonic,
      numAccounts: this.accounts.length,
    };
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(obj),
      this.password
    ).toString();
    browserStorage.setItem(key, ciphertext);
  }
  /**
   * Takes an HD path and derives keypair from it, returns pubkey
   * @param keypath: Required. HD BIP32 path of key desired based on internal seed and network
   * @returns: bitcoinjs-lib pubkey
   */
  derivePubKey(keypath: string) {
    const keyPair = bjs.bip32
      .fromSeed(this.fromMnemonic.seed, this.network)
      .derivePath(keypath);
    if (!keyPair) {
      return null;
    }
    return keyPair.publicKey;
  }

  createAccount() {
    this.changeIndex = -1;
    this.receivingIndex = -1;
    const child = this.deriveAccount(this.accounts.length);
    this.accountIndex = this.accounts.length;
    this.accounts.push(new fromZPrv(child, this.pubTypes, this.networks));
    this.backup();
    return this.accountIndex;
  }

  createKeyPair(addressIndex: number, isChange: boolean) {
    let recvIndex = isChange ? this.changeIndex : this.receivingIndex;
    if (addressIndex) {
      recvIndex = addressIndex;
    }
    return this.accounts[this.accountIndex].getKeypair(recvIndex, isChange);
  }

  /**
   * Takes keypair and gives back a p2wpkh address
   * @param keyPair: Required. bitcoinjs-lib keypair
   * @returns: string p2wpkh address
   */
  getAddressFromKeypair = function (keyPair: BIP32Interface): string {
    const payment = bjs.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: this.network,
    });
    return payment.address;
  };

  /**
   * Takes an HD path and derives keypair from it
   * @param keypath Required. HD BIP32 path of key desired based on internal seed and network
   * @returns bitcoinjs-lib keypair
   */
  deriveKeypair(keypath: string): BIP32Interface {
    const keyPair = bjs.bip32
      .fromSeed(this.fromMnemonic.seed, this.network)
      .derivePath(keypath);
    if (!keyPair) {
      return null;
    }
    return keyPair;
  }

  /**
   * Returns HDSigner's BIP32 root node
   * @returns BIP32 root node representing the seed
   */
  getRootNode(): BIP32Interface {
    return bjs.bip32.fromSeed(this.fromMnemonic.seed, this.network);
  }
}

export default HDSigner;
