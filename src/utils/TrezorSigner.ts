import BIP84 from 'bip84'
import bjs, { BIP32Interface, Network, Psbt } from 'bitcoinjs-lib'
import CryptoJS from 'crypto-js'
import TrezorConnect, { AccountInfo, SignTransaction } from 'trezor-connect'
import utxoLib from '@trezor/utxo-lib'
import bitcoinops from 'bitcoin-ops/map'
import { PubTypes } from '../types/pubtype'
import { Networks } from '../types/network'
import { Signer } from '.'
import {
  bitcoinZPubTypes,
  DEFAULT_TREZOR_DOMAIN,
  syscoinSLIP44,
  syscoinZPubTypes,
} from './constants'
import { TrezorTx, TrezorTxInput, TrezorTxOutput } from '../types/trezor-format'

export class TrezorSigner extends Signer {
  trezorInitialized = false

  constructor(
    password: string,
    isTestnet: boolean,
    networks: Networks,
    slip44: number,
    pubTypes: PubTypes,
    connectSrc = DEFAULT_TREZOR_DOMAIN,
    disableLazyLoad = false
  ) {
    super(password, isTestnet, networks, slip44, pubTypes)
    try {
      if (!this.trezorInitialized) {
        const lazyLoad = !disableLazyLoad
        TrezorConnect.init({
          connectSrc,
          lazyLoad, // this param will prevent iframe injection until TrezorConnect.method will be called
          manifest: {
            email: 'jsidhu@blockchainfoundry.co',
            appUrl: 'https://syscoin.org/',
          },
        })
        this.trezorInitialized = true // Trezor should be initialized on first run only
      }
    } catch (e) {
      throw new Error(
        `TrezorSigner should be called only from browser context: ${e}`
      )
    }

    this.restore(this.password)
  }

  /**
   * Convert syscoin PSBT to Trezor format
   * @param psbt Required. Partially signed transaction object
   * @param pathIn Optional. Custom HD Bip32 path useful if signing from a specific address like a multisig
   * @returns trezor transaction format
   */
  convertToTrezorFormat(psbt: Psbt, pathIn?: string): TrezorTx {
    const coin = this.SLIP44 === syscoinSLIP44 ? 'sys' : 'btc'
    const trezortx: TrezorTx = {
      coin,
      version: psbt.version,
      inputs: [],
      outputs: [],
    }

    for (let i = 0; i < psbt.txInputs.length; i++) {
      const scriptTypes = psbt.getInputType(i)
      const input = psbt.txInputs[i]
      const inputItem: TrezorTxInput = {
        prev_index: input.index,
        prev_hash: input.hash.reverse().toString('hex'),
      }

      if (input.sequence) inputItem.sequence = input.sequence
      const dataInput = psbt.data.inputs[i]
      let path = ''
      if (
        pathIn ||
        (dataInput.unknownKeyVals &&
          dataInput.unknownKeyVals.length > 1 &&
          dataInput.unknownKeyVals[1].key.equals(Buffer.from('path')) &&
          (!dataInput.bip32Derivation ||
            dataInput.bip32Derivation.length === 0))
      ) {
        path = pathIn || dataInput.unknownKeyVals[1].value.toString()
        inputItem.address_n = this.convertToAddressNFormat(path)
      }

      switch (scriptTypes) {
        case 'multisig':
          inputItem.script_type = 'SPENDMULTISIG'
          break
        case 'witnesspubkeyhash':
          inputItem.script_type = 'SPENDWITNESS'
          break
        default:
          inputItem.script_type = this.isP2WSHScript(
            psbt.data.inputs[i].witnessUtxo.script
          )
            ? 'SPENDP2SHWITNESS'
            : 'SPENDADDRESS'
          break
      }
      trezortx.inputs.push(inputItem)
    }

    for (let i = 0; i < psbt.txOutputs.length; i++) {
      const output = psbt.txOutputs[i]
      const chunks = bjs.script.decompile(output.script)
      const outputItem: TrezorTxOutput = {
        amount: output.value.toString(),
      }
      if (chunks[0] === bitcoinops.OP_RETURN) {
        outputItem.script_type = 'PAYTOOPRETURN'
        outputItem.op_return_data = (chunks[1] as Buffer).toString('hex')
      } else {
        if (this.isBech32(output.address)) {
          if (
            output.script.length === 34 &&
            output.script[0] === 0 &&
            output.script[1] === 0x20
          ) {
            outputItem.script_type = 'PAYTOP2SHWITNESS'
          } else {
            outputItem.script_type = 'PAYTOWITNESS'
          }
        } else {
          outputItem.script_type = this.isScriptHash(
            output.address,
            this.network
          )
            ? 'PAYTOSCRIPTHASH'
            : 'PAYTOADDRESS'
        }
        outputItem.address = output.address
      }
      trezortx.outputs.push(outputItem)
    }
    return trezortx
  }

  /**
   * Create signing information based on Trezor format
   * @param psbt Required. PSBT object from bitcoinjs-lib
   * @param pathIn Optional. Custom HD Bip32 path useful if signing from a specific address like a multisig
   * @returns trezortx or txid
   */
  async sign(psbt: Psbt, pathIn?: string): Promise<Psbt> {
    if (
      psbt.txInputs.length <= 0 ||
      psbt.txOutputs.length <= 0 ||
      psbt.version === undefined
    ) {
      throw new Error('PSBT object is lacking information')
    }
    const trezorTx = this.convertToTrezorFormat(psbt, pathIn)
    const response = await TrezorConnect.signTransaction(
      trezorTx as SignTransaction
    )
    if (response.success === true) {
      const tx = bjs.Transaction.fromHex(response.payload.serializedTx)
      this.range(psbt.data.inputs.length).forEach((i) => {
        if (tx.ins[i].witness === (undefined || null)) {
          throw new Error(
            'Please move your funds to a Segwit address: https://wiki.trezor.io/Account'
          )
        }
        const partialSig = [
          {
            pubkey: tx.ins[i].witness[1],
            signature: tx.ins[i].witness[0],
          },
        ]
        psbt.updateInput(i, { partialSig })
      })
      try {
        if (psbt.validateSignaturesOfAllInputs()) {
          psbt.finalizeAllInputs()
        }
      } catch (err) {
        console.log(err)
      }
      return psbt
    }
    throw new Error(`Trezor sign failed: ${response.payload.error}`)
  }

  /**
   * Derive HD account based on index number passed in
   * @param index Required. Account number to derive
   * @returns bip32 node for derived account
   */
  async deriveAccount(index: number): Promise<AccountInfo> {
    let bipNum = 44
    if (
      this.pubTypes === syscoinZPubTypes ||
      this.pubTypes === bitcoinZPubTypes
    ) {
      bipNum = 84
    }
    const coin = this.SLIP44 === syscoinSLIP44 ? 'sys' : 'btc'
    const keypath = `m/${bipNum}'/${this.SLIP44}'/${index}'`
    if (this.isTestnet) {
      throw new Error('Cant use TrezorSigner on testnet .')
    }

    return new Promise((resolve, reject) => {
      TrezorConnect.getAccountInfo({
        path: keypath,
        coin,
      })
        .then((response) => {
          if (response.success) {
            resolve(response.payload)
          }
          reject((response.payload as { error: string; code?: string }).error)
        })
        .catch((error) => {
          console.error('TrezorConnectError', error)
          reject(error)
        })
    })
  }

  /**
   * Restore on load from local storage and decrypt data to de-serialize objects
   * @param password Required. Decryption password to unlock seed phrase
   * @returns boolean on success for fail of restore
   */
  restore(password: string): boolean {
    let browserStorage =
      typeof localStorage === 'undefined' || localStorage === null
        ? null
        : localStorage
    if (!browserStorage) {
      const { LocalStorage } = require('node-localstorage')
      browserStorage = new LocalStorage('./scratch')
    }
    const key = `${this.network.bech32}_trezorsigner`
    const ciphertext = browserStorage.getItem(key)
    if (ciphertext === null) {
      return false
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, password)
    if (!bytes || bytes.length === 0) {
      return false
    }
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
    const { numAccounts } = decryptedData
    // sanity checks
    if (this.accountIndex > 1000) {
      return false
    }

    this.changeIndex = -1
    this.receivingIndex = -1
    this.accountIndex = 0
    for (let i = 0; i < numAccounts; i++) {
      this.accounts.push(
        new BIP84.fromZPub(
          decryptedData.xpubArr[i],
          this.pubTypes,
          this.networks
        )
      )
      if (this.accounts[i].getAccountPublicKey() !== decryptedData.xpubArr[i]) {
        throw new Error(
          'Account public key mismatch,check pubtypes and networks being used'
        )
      }
    }
    return true
  }

  /**
   * Encrypt to password and backup to local storage for persistence
   */
  backup() {
    let browserStorage =
      typeof localStorage === 'undefined' || localStorage === null
        ? null
        : localStorage
    if (!this.password) {
      return
    }
    if (!browserStorage) {
      const { LocalStorage } = require('node-localstorage')
      browserStorage = new LocalStorage('./scratch')
    }
    const key = `${this.network.bech32}_trezorsigner`
    const xpubs = []
    for (let i = 0; i < this.accounts.length; i++) {
      xpubs[i] = this.accounts[i].getAccountPublicKey()
    }
    const obj = { xpubArr: xpubs, numAccounts: this.accounts.length }
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(obj),
      this.password
    ).toString()
    browserStorage.setItem(key, ciphertext)
  }

  /**
   * Create and derive a new account
   * @returns Account index of new account
   */
  async createAccount(): Promise<number> {
    this.changeIndex = -1
    this.receivingIndex = -1
    return new Promise((resolve, reject) => {
      this.deriveAccount(this.accounts.length)
        .then((child) => {
          this.accountIndex = this.accounts.length
          this.accounts.push(
            new BIP84.fromZPub(child.descriptor, this.pubTypes, this.networks)
          )
          this.backup()
          resolve(this.accountIndex)
        })
        .catch((err) => {
          console.error(err)
          reject(err)
        })
    })
  }

  getAccountNode(): BIP32Interface {
    return bjs.bip32.fromBase58(
      this.accounts[this.accountIndex].zpub,
      this.network
    )
  }

  /**
   * Return path in addressN format
   * @param path Required derivation path
   * @returns number[]
   */
  private convertToAddressNFormat(path: string): number[] {
    const pathArray = path.replace(/'/g, '').split('/')

    pathArray.shift()

    const addressN = []
    pathArray.forEach((index) => {
      if (Number(index) <= 2 && Number(index) >= 0) {
        // eslint-disable-next-line no-bitwise
        addressN[Number(index)] = Number(pathArray[index]) | 0x80000000
      } else {
        addressN[Number(index)] = Number(pathArray[index])
      }
    })

    return addressN
  }

  /**
   * Return a boolean if a given sys address is a script hash accordingly to the syscoinNetwork selected
   * @param address Required. Address to verify
   * @param networkInfo Required. Network information to verify
   */
  private isScriptHash(address: string, networkInfo: Network): boolean {
    if (!this.isBech32(address)) {
      const decoded = utxoLib.address.fromBase58Check(address)
      if (decoded.version === networkInfo.pubKeyHash) {
        return false
      }
      if (decoded.version === networkInfo.scriptHash) {
        return true
      }
    } else {
      const decoded = utxoLib.address.fromBech32(address)
      if (decoded.data.length === 20) {
        return false
      }
      if (decoded.data.length === 32) {
        return true
      }
    }
    throw new Error('isScriptHash: Unknown address type')
  }

  /**
   * Return a boolean if a given sys address is a bech32 address
   * @param address Required. Address to check
   * @returns
   */
  private isBech32(address: string): boolean {
    try {
      utxoLib.address.fromBech32(address)
      return true
    } catch (e) {
      return false
    }
  }

  private isPaymentFactory(payment: typeof bjs.payments.p2wsh) {
    return (script: Buffer) => {
      try {
        payment({ output: script })
        return true
      } catch (err) {
        return false
      }
    }
  }

  private isP2WSHScript = this.isPaymentFactory(bjs.payments.p2wsh)

  private range(index: number): number[] {
    return [...Array(index).keys()]
  }
}

export default TrezorSigner
