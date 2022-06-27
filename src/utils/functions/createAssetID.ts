import BN from 'bn.js'

export function createAssetID(NFTID: string, assetGuid: string): string {
  const BN_ASSET = new BN(NFTID || 0).shln(32).or(new BN(assetGuid))
  return BN_ASSET.toString(10)
}

export default createAssetID
