import BN from 'bn.js'
import getBaseAssetID from './getBaseAssetID'

export function getAssetIDs(assetGuid: string): {
  baseAssetID: string
  NFTID: string
} {
  const BN_NFT = new BN(assetGuid).shrn(32)
  return { baseAssetID: getBaseAssetID(assetGuid), NFTID: BN_NFT.toString(10) }
}

export default getAssetIDs
