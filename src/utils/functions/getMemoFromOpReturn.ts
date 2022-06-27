import bjs from 'bitcoinjs-lib'
import { OP_RETURN } from 'bitcoin-ops'
import { Output } from 'bitcoinjs-lib/types/transaction'
import getMemoFromScript from './getMemoFromScript'

/**
 * Return memo from an array of outputs by finding the OP_RETURN output and extracting the memo from the script, return null if not found
 * @param outputs: Required. Tx output array
 * @param memoHeader: Optional. Memo prefix, application specific. If not passed in just return the raw opreturn script if found.
 */
export function getMemoFromOpReturn(
  outputs: Output[],
  memoHeader?: Buffer
): Buffer {
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i]
    if (output.script) {
      const chunks = bjs.script.decompile(output.script)
      if (chunks[0] === OP_RETURN) {
        if (memoHeader) {
          return getMemoFromScript(chunks[1] as Buffer, memoHeader)
        }
        return chunks[1] as Buffer
      }
    }
  }
  return null
}

export default getMemoFromOpReturn
