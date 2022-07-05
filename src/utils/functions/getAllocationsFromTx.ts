import syscointx from 'syscointx-js'
import bjs from 'bitcoinjs-lib'
import { AssetAllocation } from '../../types/asset-allocation'

/**
 * Purpose: Return allocation information for an asset transaction. Pass through to syscointx-js
 * @param tx Required. bitcoinjs transaction
 * @returns allocation information
 */
export function getAllocationsFromTx(tx: bjs.Transaction): AssetAllocation[] {
  return syscointx.getAllocationsFromTx(tx) || []
}

export default getAllocationsFromTx
