import { Network } from 'bitcoinjs-lib'
import { PsbtJson } from '../../types/psbt-json'
import SPSBT from '../classes/SPSBT'
import { syscoinNetworks } from '../constants'

export function importPsbtFromJson(jsonData: PsbtJson, network: Network) {
  return {
    psbt: SPSBT.fromBase64(jsonData.psbt, {
      network: network || syscoinNetworks.mainnet,
    }),
    assets: new Map(JSON.parse(jsonData.assets)),
  }
}

export default importPsbtFromJson
