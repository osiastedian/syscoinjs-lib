import bjs from 'bitcoinjs-lib'
import getMemoFromOpReturn from './getMemoFromOpReturn'
/**
 * Return transaction with memo appended to the inside of the OP_RETURN output, return null if not found
 * @param rawHex: Required. Raw transaction hex
 * @param memoHeader: Required. Memo prefix, application specific
 * @param buffMemo: Required. Buffer memo to put into the transaction
 */
export function setTransactionMemo(
  rawHex: string,
  memoHeader: Buffer,
  buffMemo: Buffer
) {
  const txn = bjs.Transaction.fromHex(rawHex)
  let processed = false
  if (!buffMemo) {
    return txn
  }
  for (let key = 0; key < txn.outs.length; key++) {
    const out = txn.outs[key]
    const chunksIn = bjs.script.decompile(out.script)
    if (chunksIn[0] !== bjs.opcodes.OP_RETURN) {
      // eslint-disable-next-line no-continue
      continue
    }
    txn.outs.splice(key, 1)
    const updatedData = [chunksIn[1] as Buffer, memoHeader, buffMemo]
    txn.addOutput(
      bjs.payments.embed({ data: [Buffer.concat(updatedData)] }).output,
      0
    )
    processed = true
    break
  }
  if (processed) {
    const memoRet = getMemoFromOpReturn(txn.outs, memoHeader)
    if (!memoRet || !memoRet.equals(buffMemo)) {
      return null
    }
    return txn
  }
  const updatedData = [memoHeader, buffMemo]
  txn.addOutput(
    bjs.payments.embed({ data: [Buffer.concat(updatedData)] }).output,
    0
  )
  const memoRet = getMemoFromOpReturn(txn.outs, memoHeader)
  if (!memoRet || !memoRet.equals(buffMemo)) {
    return null
  }
  return txn
}

export default setTransactionMemo
