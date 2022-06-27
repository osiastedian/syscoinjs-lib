/**
 * Return memo from a script, null otherwise
 * @param script: Required. OP_RETURN script output
 * @param memoHeader: Required. Memo prefix, application specific
 */
export function getMemoFromScript(
  script: Buffer,
  memoHeader: Buffer
): Buffer | null {
  const pos = script.indexOf(memoHeader)
  if (pos >= 0) {
    return script.slice(pos + memoHeader.length)
  }
  return null
}

export default getMemoFromScript
