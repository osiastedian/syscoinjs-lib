import { Psbt } from 'bitcoinjs-lib';
import { PsbtJson } from '../../types/psbt-json';

export function exportPsbtToJson(
  psbt: Psbt,
  assetsMap: Map<string, Object>
): PsbtJson {
  const assetsMapToStringify = assetsMap || new Map();
  return {
    psbt: psbt.toBase64(),
    assets: JSON.stringify([...assetsMapToStringify]),
  };
}

export default exportPsbtToJson;
