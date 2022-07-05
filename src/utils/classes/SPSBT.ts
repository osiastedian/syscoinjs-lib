/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-use-before-define */
import { FinalScriptWitness, PsbtInput } from 'bip174/src/lib/interfaces'
import bjs, { Network, Psbt } from 'bitcoinjs-lib'
import varuint from 'varuint-bitcoin'

interface PsbtOptsOptional {
  network?: Network
  maximumFeeRate?: number
}

type PsbtCache = any

function isFinalized(input: PsbtInput): boolean {
  return !!input.finalScriptSig || !!input.finalScriptWitness
}

function addNonWitnessTxCache(
  cache: PsbtCache,
  input: PsbtInput,
  inputIndex: number
) {
  cache.__NON_WITNESS_UTXO_BUF_CACHE[inputIndex] = input.nonWitnessUtxo
  const tx = bjs.Transaction.fromBuffer(input.nonWitnessUtxo)
  cache.__NON_WITNESS_UTXO_TX_CACHE[inputIndex] = tx
  const self = cache
  const selfIndex = inputIndex
  delete input.nonWitnessUtxo
  Object.defineProperty(input, 'nonWitnessUtxo', {
    enumerable: true,
    get() {
      const buf = self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex]
      const txCache = self.__NON_WITNESS_UTXO_TX_CACHE[selfIndex]
      if (buf !== undefined) {
        return buf
      }
      const newBuf = txCache.toBuffer()
      self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = newBuf
      return newBuf
    },
    set(data) {
      self.__NON_WITNESS_UTXO_BUF_CACHE[selfIndex] = data
    },
  })
}

function nonWitnessUtxoTxFromCache(
  cache: PsbtCache,
  input: PsbtInput,
  inputIndex: number
): any {
  const c = cache.__NON_WITNESS_UTXO_TX_CACHE

  if (!c[inputIndex]) {
    addNonWitnessTxCache(cache, input, inputIndex)
  }
  return c[inputIndex]
}

/* Override PSBT stuff so fee check isn't done as Syscoin Allocation burns outputs > inputs */
function scriptWitnessToWitnessStack(buffer: FinalScriptWitness): any[] {
  let offset = 0
  function readSlice(n) {
    offset += n
    return buffer.slice(offset - n, offset)
  }
  function readVarInt() {
    const vi = varuint.decode(buffer, offset)
    offset += varuint.decode.bytes
    return vi
  }
  function readVarSlice() {
    return readSlice(readVarInt())
  }
  function readVector() {
    const count = readVarInt()
    const vector = []
    for (let i = 0; i < count; i++) vector.push(readVarSlice())
    return vector
  }
  return readVector()
}

// override of psbt.js inputFinalizeGetAmts without fee < 0 check
function inputFinalizeGetAmts(
  inputs: PsbtInput[],
  tx: any,
  cache: PsbtCache,
  mustFinalize: boolean
) {
  let inputAmount = 0
  inputs.forEach((input, idx) => {
    if (mustFinalize && input.finalScriptSig) {
      tx.ins[idx].script = input.finalScriptSig
    }

    if (mustFinalize && input.finalScriptWitness) {
      tx.ins[idx].witness = scriptWitnessToWitnessStack(
        input.finalScriptWitness
      )
    }

    if (input.witnessUtxo) {
      inputAmount += input.witnessUtxo.value
    } else if (input.nonWitnessUtxo) {
      const nwTx = nonWitnessUtxoTxFromCache(cache, input, idx)
      const vout = tx.ins[idx].index
      const out = nwTx.outs[vout]
      inputAmount += out.value
    }
  })

  const outputAmount = tx.outs.reduce((total, o) => total + o.value, 0)
  const fee = inputAmount - outputAmount
  // SYSCOIN for burn allocations, this will be negative
  // if (fee < 0) {
  //  throw new Error('Outputs are spending more than Inputs');
  // }
  const bytes = tx.virtualSize()
  cache.__FEE = fee
  cache.__EXTRACTED_TX = tx
  cache.__FEE_RATE = Math.floor(fee / bytes)
}

function getTxCacheValue(
  key: string,
  name: string,
  inputs: PsbtInput[],
  c: PsbtCache
): number {
  if (!inputs.every(isFinalized)) {
    throw new Error(`PSBT must be finalized to calculate ${name}`)
  }
  if (key === '__FEE_RATE' && c.__FEE_RATE) return c.__FEE_RATE
  if (key === '__FEE' && c.__FEE) return c.__FEE
  let tx
  let mustFinalize = true
  if (c.__EXTRACTED_TX) {
    tx = c.__EXTRACTED_TX
    mustFinalize = false
  } else {
    tx = c.__TX.clone()
  }
  inputFinalizeGetAmts(inputs, tx, c, mustFinalize)
  if (key === '__FEE_RATE') return c.__FEE_RATE
  if (key === '__FEE') return c.__FEE

  return undefined
}

function checkFees(psbt: SPSBT, cache: PsbtCache, opts: PsbtOptsOptional) {
  const feeRate = cache.__FEE_RATE || psbt.getFeeRate()
  const vsize = cache.__EXTRACTED_TX.virtualSize()
  const satoshis = feeRate * vsize
  if (feeRate >= opts.maximumFeeRate) {
    throw new Error(
      `Warning: You are paying around ${(satoshis / 1e8).toFixed(8)} in ` +
        `fees, which is ${feeRate} satoshi per byte for a transaction ` +
        `with a VSize of ${vsize} bytes (segwit counted as 0.25 byte per ` +
        'byte). Use setMaximumFeeRate method to raise your threshold, or ' +
        'pass true to the first arg of extractTransaction.'
    )
  }
}

/**
 * "(this as any)" syntax is done so that Typescript can compile when we are accessing private variables.
 * It is possible to access these properties due to the face that natively JavaScript does not have a notion of private properties.
 */

export class SPSBT extends Psbt {
  getFeeRate(): number {
    return getTxCacheValue(
      '__FEE_RATE',
      'fee rate',
      this.data.inputs,
      (this as any).__CACHE
    )
  }

  getFee() {
    return getTxCacheValue(
      '__FEE',
      'fee',
      this.data.inputs,
      (this as any).__CACHE
    )
  }

  extractTransaction(disableFeeCheck) {
    if (!this.data.inputs.every(isFinalized)) throw new Error('Not finalized')
    const c = (this as any).__CACHE
    if (!disableFeeCheck) {
      checkFees(this, c, (this as any).opts)
    }
    if (c.__EXTRACTED_TX) return c.__EXTRACTED_TX
    const tx = c.__TX.clone()
    inputFinalizeGetAmts(this.data.inputs, tx, c, true)
    return tx
  }

  static fromBase64(data, opts = {}) {
    const buffer = Buffer.from(data, 'base64')
    const psbt = this.fromBuffer(buffer, opts)
    psbt.getFeeRate = SPSBT.prototype.getFeeRate
    psbt.getFee = SPSBT.prototype.getFee
    psbt.extractTransaction = SPSBT.prototype.extractTransaction
    return psbt
  }
}

export default SPSBT
