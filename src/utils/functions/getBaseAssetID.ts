import BN from 'bn.js';

export function getBaseAssetID(assetGuid: string) {
  return new BN(assetGuid).and(new BN(0xffffffff)).toString(10);
}

export default getBaseAssetID;
