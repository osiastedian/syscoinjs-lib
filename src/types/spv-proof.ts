import BN from 'bn.js'

export interface SPVProof {
  ethtxid: string
  blockhash: string
  assetguid: string
  destinationaddress: string
  amount: BN
  txvalue: string
  txroot: string
  txparentnodes: string
  txpath: string
  blocknumber: number
  receiptvalue: string
  receiptroot: string
  receiptparentnodes: string
}
