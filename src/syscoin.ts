import { PsbtInput, TransactionInput } from 'bip174/src/lib/interfaces'
import { Network, Psbt } from 'bitcoinjs-lib'
import BN from 'bn.js'
import syscointx from 'syscointx-js'
import { BlockbookTransactionBTC } from './types/blockboox-tx'
import { NotaryAsset } from './types/notary-details'
import { SanitizedUtxoObject, UTXO, UtxoObject } from './types/utxo-object'

import utils from './utils'
import {
  AssetMap,
  SanitizeUTXOTxOptions,
} from './utils/functions/sanitizeBlockbookUTXOs'
import {
  SendRawTransactionError,
  SendRawTransactionSuccess,
} from './utils/functions/sendRawTransaction'
import HDSigner from './utils/HDSigner'
import TrezorSigner from './utils/TrezorSigner'

type Signer = TrezorSigner | HDSigner

class Syscoin {
  private Signer: Signer = null

  private blockbookURL: string

  private network: Network

  constructor(
    SignerIn: Signer | null,
    blockbookURL: string,
    network?: Network
  ) {
    this.blockbookURL = blockbookURL
    if (SignerIn) {
      this.Signer = SignerIn
      this.Signer.blockbookURL = blockbookURL
      this.network = network || this.Signer.network
    } else {
      this.network = network || utils.syscoinNetworks.mainnet
    }
  }

  // proxy to signAndSend
  async signAndSendWithSigner(
    psbt: Psbt,
    notaryAssets: Map<string, NotaryAsset>,
    SignerIn: Signer,
    pathIn: string
  ) {
    return this.signAndSend(psbt, notaryAssets, SignerIn, pathIn)
  }

  /**
   * Signs/Notarizes if necessary and Sends transaction to network using Signer
   * @param psbt Required. The resulting PSBT object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
   * @param notaryAssets Optional. Asset objects that are required for notarization, fetch signatures via fetchNotarizationFromEndPoint()
   * @param SignerIn Optional. Signer used to sign transaction
   * @param pathIn
   * @returns Promise that resolves PSBT
   */
  async signAndSend(
    psbtIn: Psbt,
    notaryAssets: Map<string, NotaryAsset>,
    SignerIn?: Signer,
    pathIn?: string
  ): Promise<Psbt> {
    const signer = SignerIn || this.Signer
    const psbtClone = psbtIn.clone()
    let psbt = await signer.sign(psbtIn, pathIn)
    let tx = null
    try {
      tx = psbt.extractTransaction()
    } catch (err) {
      console.log('Transaction incomplete, requires more signatures...')
      return psbt
    }
    if (notaryAssets) {
      // check to see if notarization was already done
      const allocations = utils.getAllocationsFromTx(tx)
      const emptySig = Buffer.alloc(65, 0)
      let needNotary = false
      for (let i = 0; i < allocations.length; i++) {
        // if notarySignature exists and is an empty signature (default prior to filling) then we need to notarize this asset allocation send
        if (
          allocations[i].notarysig &&
          allocations[i].notarysig.length > 0 &&
          (allocations[i].notarysig as Buffer).equals(emptySig)
        ) {
          needNotary = true
          break
        }
      }
      // if notarization is required
      if (needNotary) {
        const notarizedDetails = await utils.notarizePSBT(
          psbt,
          notaryAssets,
          psbt.extractTransaction().toHex()
        )
        if (notarizedDetails && notarizedDetails.output) {
          psbt = utils.copyPSBT(
            psbtClone,
            this.Signer.network,
            notarizedDetails.index,
            notarizedDetails.output
          )
          psbt = await signer.sign(psbt, pathIn)
          try {
            // will fail if not complete
            psbt.extractTransaction()
          } catch (err) {
            console.log('Transaction incomplete, requires more signatures...')
            return psbt
          }
        } else {
          return psbt
        }
      }
    }

    if (this.blockbookURL) {
      const resSend = await utils.sendRawTransaction(
        this.blockbookURL,
        psbt.extractTransaction().toHex(),
        signer
      )
      const resAsError = resSend as SendRawTransactionError
      const resAsSuccess = resSend as SendRawTransactionSuccess
      if (resAsError.error) {
        throw Object.assign(
          new Error(`could not send tx! error: ${resAsError.error.message}`),
          { code: 402 }
        )
      } else if (resAsSuccess.result) {
        console.log(`tx successfully sent! txid: ${resAsSuccess.result}`)
        return psbt
      } else {
        throw Object.assign(
          new Error(`Unrecognized response from backend: ${resSend}`),
          { code: 402 }
        )
      }
    }
    return psbt
  }

  /**
   * Craft PSBT from res object. Detects witness/non-witness UTXOs and sets appropriate data required for bitcoinjs-lib to sign properly
   * @param res Required. The resulting object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns psbt from bitcoinjs-lib
   */
  async createPSBTFromRes(
    res: { txVersion; inputs; outputs },
    redeemOrWitnessScript?: Buffer
  ) {
    const psbt = new utils.bitcoinjs.Psbt({ network: this.network })
    const prevTx = new Map()
    psbt.setVersion(res.txVersion)
    for (let i = 0; i < res.inputs.length; i++) {
      const input = res.inputs[i]
      const inputObj: PsbtInput & TransactionInput = {
        hash: input.txId,
        index: input.vout,
        sequence: input.sequence,
        bip32Derivation: [],
      }

      // if legacy address type get previous tx as required by bitcoinjs-lib to sign without witness
      // Note: input.address is only returned by Blockbook XPUB UTXO API and not address UTXO API and this address is used to assign type
      if (input.type === 'LEGACY') {
        if (prevTx.has(input.txId)) {
          inputObj.nonWitnessUtxo = prevTx.get(input.txId)
        } else {
          // eslint-disable-next-line no-await-in-loop
          const hexTx = (await utils.fetchBackendRawTx(
            this.blockbookURL,
            input.txId
          )) as BlockbookTransactionBTC
          if (hexTx) {
            const bufferTx = Buffer.from(hexTx.hex, 'hex')
            prevTx.set(input.txId, bufferTx)
            inputObj.nonWitnessUtxo = bufferTx
          } else {
            console.log(
              `Could not fetch input transaction for legacy UTXO: ${input.txId}`
            )
          }
          if (redeemOrWitnessScript) {
            inputObj.redeemScript = redeemOrWitnessScript
          }
        }
      } else {
        inputObj.witnessUtxo = {
          script: utils.bitcoinjs.address.toOutputScript(
            input.address,
            this.network
          ),
          value: input.value.toNumber(),
        }
        if (redeemOrWitnessScript) {
          inputObj.witnessScript = redeemOrWitnessScript
        }
      }
      psbt.addInput(inputObj)
      if (input.address) {
        psbt.addUnknownKeyValToInput(i, {
          key: Buffer.from('address'),
          value: Buffer.from(input.address),
        })
      }
      if (input.path) {
        psbt.addUnknownKeyValToInput(i, {
          key: Buffer.from('path'),
          value: Buffer.from(input.path),
        })
      }
    }
    res.outputs.forEach((output) => {
      psbt.addOutput({
        script: output.script,
        address: output.script ? null : output.address,
        value: output.value.toNumber(),
      })
    })
    return psbt
  }

  /**
   * Signs/Notarizes if necessary and Sends transaction to network using WIF
   * @param psbt Required. The resulting PSBT object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
   * @param wif Required. Private key in WIF format to sign inputs of the transaction for
   * @param notaryAssets Optional. Asset objects that are required for notarization, fetch signatures via fetchNotarizationFromEndPoint()
   * @returns PSBT signed success or unsigned if failure
   */
  async signAndSendWithWIF(psbtIn, wif, notaryAssets) {
    // notarize if necessary
    const psbtClone = psbtIn.clone()
    let psbt = await utils.signWithWIF(psbtIn, wif, this.network)
    let tx = null
    // if not complete, we shouldn't notarize or try to send to network must get more signatures so return it to client
    try {
      // will fail if not complete
      tx = psbt.extractTransaction()
    } catch (err) {
      return psbt
    }
    if (notaryAssets) {
      // check to see if notarization was already done
      const allocations = utils.getAllocationsFromTx(tx)
      const emptySig = Buffer.alloc(65, 0)
      let needNotary = false
      for (let i = 0; i < allocations.length; i++) {
        // if notarySignature exists and is an empty signature (default prior to filling) then we need to notarize this asset allocation send
        if (
          allocations[i].notarysig &&
          allocations[i].notarysig.length > 0 &&
          (allocations[i].notarysig as Buffer).equals(emptySig)
        ) {
          needNotary = true
          break
        }
      }
      // if notarization is required
      if (needNotary) {
        const notarizedDetails = await utils.notarizePSBT(
          psbt,
          notaryAssets,
          psbt.extractTransaction().toHex()
        )
        if (notarizedDetails && notarizedDetails.output) {
          psbt = utils.copyPSBT(
            psbtClone,
            this.network,
            notarizedDetails.index,
            notarizedDetails.output
          )
          psbt = await utils.signWithWIF(psbt, wif, this.network)
          try {
            // will fail if not complete
            psbt.extractTransaction()
          } catch (err) {
            return psbt
          }
        } else {
          return psbt
        }
      }
    }
    if (this.blockbookURL) {
      const resSend = await utils.sendRawTransaction(
        this.blockbookURL,
        psbt.extractTransaction().toHex()
      )
      const resAsError = resSend as SendRawTransactionError
      const resAsSuccess = resSend as SendRawTransactionSuccess

      if (resAsError.error) {
        throw Object.assign(
          new Error(`could not send tx! error: ${resAsError.error.message}`),
          { code: 402 }
        )
      } else if (resAsSuccess.result) {
        console.log(`tx successfully sent! txid: ${resAsSuccess.result}`)
        return psbt
      } else {
        throw Object.assign(
          new Error(`Unrecognized response from backend: ${resSend}`),
          { code: 402 }
        )
      }
    }
    return psbt
  }

  /**
   * Fetch UTXO's for an address or XPUB from backend Blockbook provider and sanitize them for use by upstream libraries
   * @param utxos Optional. Pass in specific utxos to fund a transaction.
   * @param fromXpubOrAddress Optional. If wanting to fund from specific XPUB's or addresses specify this field should be set. Can be an array of XPUB or addresses in combination.
   * @param txOpts Optional. Transaction options. Fields are described below:
   * @param assetMap Optional (For asset transactions only). Description of Map:
   * 
   * ex.
   * ```
   * const assetMap = new Map([
      [assetGuid, { outputs: [{ value: new BN(0), address: 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' }] }]
    ])
    * ```
   * @param excludeZeroConf Optional. False by default. Filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
   * @returns Returns JSON object in response, sanitized UTXO object array in JSON
   */
  async fetchAndSanitizeUTXOs(
    utxos?: UTXO[] | UtxoObject,
    fromXpubOrAddress?: string | string[],
    txOpts?: SanitizeUTXOTxOptions,
    assetMap?: AssetMap,
    excludeZeroConf?: boolean
  ): Promise<SanitizedUtxoObject> {
    if (!utxos) {
      if (fromXpubOrAddress) {
        const addresses = Array.isArray(fromXpubOrAddress)
          ? fromXpubOrAddress
          : [fromXpubOrAddress]

        const utxoRequests = []
        const concatSanitizedUTXOS: SanitizedUtxoObject = {
          utxos: [],
        }
        addresses.forEach((addressOrXpub) =>
          utxoRequests.push(
            utils.fetchBackendUTXOS(this.blockbookURL, addressOrXpub)
          )
        )
        const responses = await Promise.all(utxoRequests)
        responses.forEach((response) => {
          const sanitizedUtxos = utils.sanitizeBlockbookUTXOs(
            response.addressOrXpub,
            response,
            this.network,
            txOpts,
            assetMap,
            excludeZeroConf
          )
          if (!concatSanitizedUTXOS.utxos) {
            concatSanitizedUTXOS.utxos = sanitizedUtxos.utxos
          } else {
            concatSanitizedUTXOS.utxos = [...concatSanitizedUTXOS.utxos].concat(
              [...sanitizedUtxos.utxos]
            )
          }
          if (!concatSanitizedUTXOS.assets && sanitizedUtxos.assets) {
            concatSanitizedUTXOS.assets = sanitizedUtxos.assets
          } else if (concatSanitizedUTXOS.assets && sanitizedUtxos.assets) {
            concatSanitizedUTXOS.assets = new Map(
              [...concatSanitizedUTXOS.assets].concat([
                ...sanitizedUtxos.assets,
              ])
            )
          }
        })
        return concatSanitizedUTXOS
      }
      if (this.Signer) {
        const fetchedUtxos = await utils.fetchBackendUTXOS(
          this.blockbookURL,
          this.Signer.getAccountXpub()
        )
        return utils.sanitizeBlockbookUTXOs(
          fromXpubOrAddress as string,
          fetchedUtxos,
          this.network,
          txOpts,
          assetMap,
          excludeZeroConf
        )
      }
    }
    return utils.sanitizeBlockbookUTXOs(
      fromXpubOrAddress as string,
      utxos,
      this.network,
      txOpts,
      assetMap,
      excludeZeroConf
    )
  }

  /**
   * Send Syscoin or Bitcoin or like coins.
   * @param txOpts Optional. Transaction options. Fields are described below:
   * @param changeAddressParam Optional. Change address if defined is where change outputs are sent to. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param outputsArr  Required. Output array defining tuples to which addresses to send coins to and how much
   * @param feeRate Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param fromXpubOrAddress fromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos Optional. Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @param inputsArr Optional. Force these inputs to be included in the transaction, not to be confused with 'utxos' which is optional inputs that *may* be included as part of the funding process.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async createTransaction(
    txOpts: SanitizeUTXOTxOptions | undefined | null,
    changeAddressParam: string | undefined | null,
    outputsArr: UTXO[],
    feeRate: BN,
    fromXpubOrAddress: string,
    utxos: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer,
    inputsArr?: UTXO[]
  ) {
    let changeAddress = changeAddressParam
    if (this.Signer) {
      if (!changeAddress) {
        changeAddress = await this.Signer.getNewChangeAddress()
      }
    }
    const sanitizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      fromXpubOrAddress,
      txOpts
    )
    let inputsArrVal = inputsArr
    if (inputsArrVal) {
      inputsArrVal = utils.sanitizeBlockbookUTXOs(
        fromXpubOrAddress,
        inputsArrVal,
        this.network,
        txOpts
      ).utxos
    }
    const res = syscointx.createTransaction(
      txOpts,
      sanitizedUtxos,
      changeAddress,
      outputsArr,
      feeRate,
      inputsArrVal
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (fromXpubOrAddress || !this.Signer) {
      return {
        psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(
          psbt,
          sanitizedUtxos.assets
        ),
      }
    }
    return this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, sanitizedUtxos.assets)
    )
  }
}

export default Syscoin
