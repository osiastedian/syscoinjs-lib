import { PsbtInput, TransactionInput } from 'bip174/src/lib/interfaces'
import { Network, Psbt } from 'bitcoinjs-lib'
import BN from 'bn.js'
import syscointx from 'syscointx-js'
import { AssetOpts } from './types/asset-information'
import AssetMap from './types/asset-map'
import AssetMintOptions from './types/asset-min-options'
import { BlockbookTransactionBTC } from './types/blockboox-tx'
import { NotaryAsset } from './types/notary-details'
import TxOptions from './types/tx-options'
import { SanitizedUtxoObject, UTXO, UtxoObject } from './types/utxo-object'

import utils from './utils'

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
   * @param txOpts Optional. Transaction options.
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
    txOpts?: TxOptions,
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
   * @param txOpts Optional. Transaction options.
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
    txOpts: TxOptions | undefined | null,
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

  /**
   * Create new Syscoin SPT.
   * @param assetOpts Asset details
   * @param txOpts Transaction options
   * @param sysChangeAddressParam Change address if defined is where Syscoin only change outputs are sent to. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param sysReceivingAddressParam Address which will hold the new asset. If not defined and Signer is defined then a new receiving address will be automatically created using the next available receiving address index in the HD path
   * @param feeRate Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async assetNew(
    assetOpts: AssetOpts,
    txOpts?: TxOptions,
    sysChangeAddressParam?: string,
    sysReceivingAddressParam?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let sysChangeAddress = sysChangeAddressParam
    let sysReceivingAddress = sysReceivingAddressParam
    if (this.Signer) {
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress()
      }
      if (!sysReceivingAddress) {
        sysReceivingAddress = await this.Signer.getNewReceivingAddress()
      }
    }
    // create dummy map where GUID will be replaced by deterministic one based on first input txid, we need this so fees will be accurately determined on first place of coinselect
    const assetMap: AssetMap = new Map([
      [
        '0',
        {
          changeAddress: sysChangeAddress,
          outputs: [{ value: new BN(0), address: sysReceivingAddress }],
        },
      ],
    ])
    // true last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const sanitizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      true
    )
    const res = syscointx.assetNew(
      assetOpts,
      txOpts,
      sanitizedUtxos,
      assetMap,
      sysChangeAddress,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
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
  /**
   * Update existing Syscoin SPT.
   * @param assetGuid Required. Asset GUID to update.
   * @param assetOpts Asset details.
   * @param txOpts Transaction options.
   * @param assetMap Asset Change Map
   * @param sysChangeAddress Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param feeRate Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos  Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */

  async assetUpdate(
    assetGuid: string,
    assetOpts: AssetOpts | undefined | null,
    txOpts: TxOptions | undefined | null,
    assetMap: AssetMap,
    sysChangeAddress?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let sysChangeAddressVal = sysChangeAddress
    let utxosInitial = utxos
    if (!utxosInitial) {
      if (sysFromXpubOrAddress || !this.Signer) {
        utxosInitial = await utils.fetchBackendUTXOS(
          this.blockbookURL,
          sysFromXpubOrAddress
        )
      } else if (this.Signer) {
        utxosInitial = await utils.fetchBackendUTXOS(
          this.blockbookURL,
          this.Signer.getAccountXpub()
        )
      }
    }
    if (this.Signer) {
      // eslint-disable-next-line no-restricted-syntax
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          // eslint-disable-next-line no-await-in-loop
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress()
        }
      }
      if (!sysChangeAddressVal) {
        sysChangeAddressVal = await this.Signer.getNewChangeAddress()
      }
    }
    // true last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const sanitizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxosInitial,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      true
    )
    const res = syscointx.assetUpdate(
      assetGuid,
      assetOpts,
      txOpts,
      sanitizedUtxos,
      assetMap,
      sysChangeAddressVal,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
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

  /**
   * Issue supply by sending it from asset to an address holding an allocation of the asset.
   * @param txOpts Optional. Transaction options.
   * @param assetMapIn Asset Change Map
   * @param sysChangeAddressParam Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param feeRate Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos  Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async function(
    txOpts: TxOptions | undefined | null,
    assetMapIn: AssetMap,
    sysChangeAddressParam?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let sysChangeAddress = sysChangeAddressParam
    if (this.Signer) {
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress()
      }
    }
    const BN_ZERO = new BN(0)
    const assetMap = new Map()
    // create new map with base ID's setting zero val output in the base asset outputs array
    // eslint-disable-next-line no-restricted-syntax
    for (const [assetGuid, valueAssetObj] of assetMapIn.entries()) {
      const baseAssetID = utils.getBaseAssetID(assetGuid)
      // if NFT
      if (baseAssetID !== assetGuid) {
        // likely NFT issuance only with no base value asset issued, create new base value object so assetSend can perform proof of ownership
        if (!assetMapIn.has(baseAssetID)) {
          const valueBaseAssetObj = {
            outputs: [{ address: sysChangeAddress, value: BN_ZERO }],
            changeAddress: sysChangeAddress,
          }
          assetMap.set(baseAssetID, valueBaseAssetObj)
        }
        assetMap.set(assetGuid, valueAssetObj)
        // regular FT
      } else {
        valueAssetObj.outputs.push({
          address: sysChangeAddress,
          value: BN_ZERO,
        })
        valueAssetObj.changeAddress = sysChangeAddress
        assetMap.set(assetGuid, valueAssetObj)
      }
    }
    if (this.Signer) {
      // eslint-disable-next-line no-restricted-syntax
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          // eslint-disable-next-line no-await-in-loop
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress()
        }
      }
    }
    // true last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const santizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      true
    )
    const res = syscointx.assetSend(
      txOpts,
      santizedUtxos,
      assetMap,
      sysChangeAddress,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(
          psbt,
          santizedUtxos.assets
        ),
      }
    }
    return this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, santizedUtxos.assets)
    )
  }

  /**
   * Send an asset allocations to other users.
   * @param txOpts Optional. Transaction options.
   * @param assetMap Asset Change Map
   * @param sysChangeAddressParam Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param feeRate Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos  Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async assetAllocationSend(
    txOpts: TxOptions | undefined | null,
    assetMap: AssetMap,
    sysChangeAddressParam?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let sysChangeAddress = sysChangeAddressParam
    if (this.Signer) {
      // eslint-disable-next-line no-restricted-syntax
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          // eslint-disable-next-line no-await-in-loop
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress()
        }
      }
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress()
      }
    }
    // false last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const santizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    )
    const res = syscointx.assetAllocationSend(
      txOpts,
      santizedUtxos,
      assetMap,
      sysChangeAddress,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(
          psbt,
          santizedUtxos.assets
        ),
      }
    }
    return this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, santizedUtxos.assets)
    )
  }

  /**
   * Burn an asset allocation for purpose of provably burning. Could be used to create proof-of-burn for SysEthereum bridge by specifying the ethaddress as destination in assetOpts.
   * @param assetOpts Asset options.
   * @param txOpts Optional. Transaction options.
   * @param assetMap Asset Change Map
   * @param sysChangeAddressParam Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param feeRate Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos  Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async assetAllocationBurn(
    assetOpts: {
      /**
       * Optional. If burning for purpose of sending over SysEthereum bridge specify the destination Ethereum address where tokens should be sent to on Ethereum.
       */
      ethaddress?: string
    },
    txOpts: TxOptions | undefined | null,
    assetMap: AssetMap,
    sysChangeAddressParam?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let sysChangeAddress = sysChangeAddressParam
    if (this.Signer) {
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress()
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          // eslint-disable-next-line no-await-in-loop
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress()
        }
      }
    }
    // true last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const sanitizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    )
    const res = syscointx.assetAllocationBurn(
      assetOpts,
      txOpts,
      sanitizedUtxos,
      assetMap,
      sysChangeAddress,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
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

  /**
   * Minting new asset using proof-of-lock on Ethereum as a proof to mint tokens on Syscoin.
   * @param assetOptsParam Optional. If you have the Ethereum TXID and want to use eth-proof you can just specify the ethtxid and web3url fields
   * @param txOpts Optional. Transaction options
   * @param assetMapParam Optional. Auto-filled by eth-proof if it is used (pass ethtxid and web3url in assetOpts).
   * @param sysChangeAddressParam Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param feeRate Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress Optional. If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos  Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async assetAllocationMint(
    assetOptsParam: AssetMintOptions,
    txOpts: TxOptions | undefined | null,
    assetMapParam: AssetMap,
    sysChangeAddressParam?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let assetMap = assetMapParam
    let assetOpts = assetOptsParam
    let sysChangeAddress = sysChangeAddressParam
    if (this.Signer) {
      if (assetMap) {
        // eslint-disable-next-line no-restricted-syntax
        for (const valueAssetObj of assetMap.values()) {
          if (!valueAssetObj.changeAddress) {
            valueAssetObj.changeAddress =
              // eslint-disable-next-line no-await-in-loop
              await this.Signer.getNewChangeAddress()
          }
        }
      }
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress()
      }
    }
    if (!assetMap) {
      const ethProof = await utils.buildEthProof(assetOpts)
      let changeAddress
      if (this.Signer) {
        changeAddress = await this.Signer.getNewChangeAddress()
      }
      if (sysChangeAddress === changeAddress) {
        throw Object.assign(
          new Error(
            'Syscoin and asset change address cannot be the same for assetAllocationMint!'
          ),
          { code: 402 }
        )
      }
      assetMap = new Map([
        [
          ethProof.assetguid,
          {
            changeAddress,
            outputs: [
              { value: ethProof.amount, address: ethProof.destinationaddress },
            ],
          },
        ],
      ])
      assetOpts = {
        ethtxid: Buffer.from(ethProof.ethtxid, 'hex'),
        blockhash: Buffer.from(ethProof.blockhash, 'hex'),
        txvalue: Buffer.from(ethProof.txvalue, 'hex'),
        txroot: Buffer.from(ethProof.txroot, 'hex'),
        txparentnodes: Buffer.from(ethProof.txparentnodes, 'hex'),
        txpath: Buffer.from(ethProof.txpath, 'hex'),
        receiptvalue: Buffer.from(ethProof.receiptvalue, 'hex'),
        receiptroot: Buffer.from(ethProof.receiptroot, 'hex'),
        receiptparentnodes: Buffer.from(ethProof.receiptparentnodes, 'hex'),
      }
    }

    // false last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const sanitizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    )
    const res = syscointx.assetAllocationMint(
      assetOpts,
      txOpts,
      sanitizedUtxos,
      assetMap,
      sysChangeAddress,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
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

  /**
   * Burn Syscoin to mint SYSX
   * @param txOpts Transaction options
   * @param assetMap Asset Map
   * @param sysChangeAddressParam Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
   * @param feeRate Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
   * @param sysFromXpubOrAddress Optional. If wanting to fund from a specific XPUB or address specify this field should be set
   * @param utxos Optional. Pass in specific utxos to fund a transaction.
   * @param redeemOrWitnessScript Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
   * @returns PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
   */
  async syscoinBurnToAssetAllocation(
    txOpts: TxOptions | undefined | null,
    assetMap: AssetMap,
    sysChangeAddressParam?: string,
    feeRate?: BN,
    sysFromXpubOrAddress?: string,
    utxos?: UtxoObject | UTXO[],
    redeemOrWitnessScript?: Buffer
  ) {
    let sysChangeAddress = sysChangeAddressParam
    if (this.Signer) {
      // eslint-disable-next-line no-restricted-syntax
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          // eslint-disable-next-line no-await-in-loop
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress()
        }
      }
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress()
      }
    }
    // false last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    const sanitizedUtxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    )
    const res = syscointx.syscoinBurnToAssetAllocation(
      txOpts,
      sanitizedUtxos,
      assetMap,
      sysChangeAddress,
      feeRate
    )
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript)
    if (sysFromXpubOrAddress || !this.Signer) {
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
