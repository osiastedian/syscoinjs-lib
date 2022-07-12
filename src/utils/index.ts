import BN from 'bn.js'
import bjs from 'bitcoinjs-lib'
import HDSigner from './HDSigner'
import {
  bitcoinNetworks,
  bitcoinSLIP44,
  bitcoinXPubTypes,
  bitcoinZPubTypes,
  syscoinNetworks,
  syscoinSLIP44,
  syscoinXPubTypes,
  syscoinZPubTypes,
} from './constants'
import TrezorSigner from './TrezorSigner'
import fetchBackendUTXOS from './functions/fetchBackendUTXOS'
import fetchBackendSPVProof from './functions/fetchBackendSPVProof'
import sanitizeBlockbookUTXOs from './functions/sanitizeBlockbookUTXOs'
import fetchBackendAccount from './functions/fetchBackendAccount'
import fetchBackendAsset from './functions/fetchBackendAsset'
import fetchBackendListAssets from './functions/fetchBackendListAssets'
import fetchBackendRawTx from './functions/fetchBackendRawTx'
import fetchNotarizationFromEndPoint from './functions/fetchNotarizationFromEndPoint'
import fetchProviderInfo from './functions/fetchProviderInfo'
import fetchBackendBlock from './functions/fetchBackendBlock'
import fetchEstimateFee from './functions/fetchEstimateFee'
import sendRawTransaction from './functions/sendRawTransaction'
import buildEthProof from './functions/buildEthProof'
import getAssetsRequiringNotarization from './functions/getAssetsRequiringNotarization'
import notarizePSBT from './functions/notarizePSBT'
import signWithWIF from './functions/signWithWIF'
import getMemoFromScript from './functions/getMemoFromScript'
import getMemoFromOpReturn from './functions/getMemoFromOpReturn'
import getAllocationsFromTx from './functions/getAllocationsFromTx'
import createAssetID from './functions/createAssetID'
import getBaseAssetID from './functions/getBaseAssetID'
import getAssetIDs from './functions/getAssetIDs'
import setTransactionMemo from './functions/setTransactionMemo'
import copyPSBT from './functions/copyPSBT'
import importPsbtFromJson from './functions/importPsbtFromJson'
import exportPsbtToJson from './functions/exportPsbtToJson'

export default {
  bitcoinXPubTypes,
  bitcoinZPubTypes,
  bitcoinNetworks,
  syscoinXPubTypes,
  syscoinZPubTypes,
  syscoinNetworks,
  syscoinSLIP44,
  bitcoinSLIP44,
  HDSigner,
  TrezorSigner,
  fetchBackendUTXOS,
  fetchBackendSPVProof,
  sanitizeBlockbookUTXOs,
  fetchBackendAccount,
  fetchBackendAsset,
  fetchBackendListAssets,
  fetchBackendRawTx,
  fetchNotarizationFromEndPoint,
  fetchProviderInfo,
  fetchBackendBlock,
  fetchEstimateFee,
  sendRawTransaction,
  buildEthProof,
  getAssetsRequiringNotarization,
  notarizePSBT,
  signWithWIF,
  getMemoFromScript,
  getMemoFromOpReturn,
  getAllocationsFromTx,
  bitcoinjs: bjs,
  BN,
  createAssetID,
  getBaseAssetID,
  getAssetIDs,
  setTransactionMemo,
  copyPSBT,
  importPsbtFromJson,
  exportPsbtToJson,
}
