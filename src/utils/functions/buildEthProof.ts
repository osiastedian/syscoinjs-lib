/* eslint-disable import/no-extraneous-dependencies */
import { VerifyProof, GetProof } from 'eth-proof'
import { encode } from 'eth-util-lite'
import { Log } from 'eth-object'
import { ERC20Manager, tokenFreezeFunction } from '../constants'
import { SPVProof } from '../../types/spv-proof'

const Web3 = require('web3')

interface AssetOptions {
  web3url: string
  ethtxid: string
}

/**
 * Purpose: Build Ethereum SPV proof using eth-proof library
 * @param assetOpts Required. Object containing web3url and ethtxid fields populated
 * @returns Returns JSON object in response, SPV proof object in JSON
 */
async function buildEthProof(assetOpts: AssetOptions): Promise<SPVProof> {
  const web3 = new Web3()
  const ethProof = new GetProof(assetOpts.web3url)
  const web3Provider = new Web3(assetOpts.web3url)
  try {
    let result = await ethProof.transactionProof(assetOpts.ethtxid)
    const txObj = await VerifyProof.getTxFromTxProofAt(
      result.txProof,
      result.txIndex
    )
    const txvalue = txObj.hex.substring(2) // remove hex prefix
    const inputData = txObj.data.slice(4).toString('hex') // get only data without function selector
    const paramTxResults = web3.eth.abi.decodeParameters(
      [
        {
          type: 'uint',
          name: 'value',
        },
        {
          type: 'uint32',
          name: 'assetGUID',
        },
        {
          type: 'string',
          name: 'syscoinAddress',
        },
      ],
      inputData
    )
    const assetguid = paramTxResults.assetGUID
    const destinationaddress = paramTxResults.syscoinAddress
    const txroot = result.header[4].toString('hex')
    const txRootFromProof = VerifyProof.getRootFromProof(result.txProof)
    if (txroot !== txRootFromProof.toString('hex')) {
      throw new Error('TxRoot mismatch')
    }
    const txparentnodes = encode(result.txProof).toString('hex')
    const txpath = encode(result.txIndex).toString('hex')
    const blocknumber = parseInt(result.header[8].toString('hex'), 16)
    const block = await web3Provider.eth.getBlock(blocknumber)
    const blockhash = block.hash.substring(2) // remove hex prefix
    const receiptroot = result.header[5].toString('hex')
    result = await ethProof.receiptProof(assetOpts.ethtxid)
    const txReceipt = await VerifyProof.getReceiptFromReceiptProofAt(
      result.receiptProof,
      result.txIndex
    )
    const receiptRootFromProof = VerifyProof.getRootFromProof(
      result.receiptProof
    )
    if (receiptroot !== receiptRootFromProof.toString('hex')) {
      throw new Error('ReceiptRoot mismatch')
    }
    const receiptparentnodes = encode(result.receiptProof).toString('hex')
    const blockHashFromHeader = VerifyProof.getBlockHashFromHeader(
      result.header
    )
    if (blockhash !== blockHashFromHeader.toString('hex')) {
      throw new Error('BlockHash mismatch')
    }
    const receiptvalue = txReceipt.hex.substring(2) // remove hex prefix
    let amount = new web3.utils.BN(0)
    for (let i = 0; i < txReceipt.setOfLogs.length; i++) {
      const log = Log.fromRaw(txReceipt.setOfLogs[i]).toObject()
      if (log.topics && log.topics.length !== 1) {
        /* eslint-disable no-continue */
        continue
      }
      // event TokenFreeze(address freezer, uint value, uint precisions);
      if (
        log.topics[0].toString('hex').toLowerCase() ===
          tokenFreezeFunction.toLowerCase() &&
        log.address.toLowerCase() === ERC20Manager.toLowerCase()
      ) {
        const paramResults = web3.eth.abi.decodeParameters(
          [
            {
              type: 'uint32',
              name: 'assetGUID',
            },
            {
              type: 'address',
              name: 'freezer',
            },
            {
              type: 'uint',
              name: 'value',
            },
            {
              type: 'uint',
              name: 'precisions',
            },
          ],
          log.data
        )
        const precisions = new web3.utils.BN(paramResults.precisions)
        const value = new web3.utils.BN(paramResults.value)

        // get precision
        const erc20precision = precisions.maskn(32)
        const sptprecision = precisions.shrn(32).maskn(8)
        // local precision can range between 0 and 8 decimal places, so it should fit within a CAmount
        // we pad zero's if erc20's precision is less than ours so we can accurately get the whole value of the amount transferred
        if (sptprecision.gt(erc20precision)) {
          amount = value.mul(
            new web3.utils.BN(10).pow(sptprecision.sub(erc20precision))
          )
          // ensure we truncate decimals to fit within int64 if erc20's precision is more than our asset precision
        } else if (sptprecision.lt(erc20precision)) {
          amount = value.div(
            new web3.utils.BN(10).pow(erc20precision.sub(sptprecision))
          )
        } else {
          amount = value
        }
        break
      }
    }
    const ethtxid = web3.utils.sha3(Buffer.from(txvalue, 'hex')).substring(2) // not txid but txhash of the tx object used for calculating tx commitment without requiring transaction deserialization
    return {
      ethtxid,
      blockhash,
      assetguid,
      destinationaddress,
      amount,
      txvalue,
      txroot,
      txparentnodes,
      txpath,
      blocknumber,
      receiptvalue,
      receiptroot,
      receiptparentnodes,
    }
  } catch (e) {
    console.log(`Exception: ${e.message}`)
    return e
  }
}

export default buildEthProof
