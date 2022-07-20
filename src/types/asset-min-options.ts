export interface AssetMintOptions {
  /**
   * The trasaction that calls freezeBurnERC20() on ERC20Manager contract
   */
  ethtxid: Buffer

  /**
   * Block hash
   */
  blockhash?: Buffer
  /**
   * If using eth-proof fully qualified Web3 HTTP-RPC URL that eth-proof needs to obtain the tx proof and receipt proof information needed by Syscoin to valdiate the mint
   */
  web3url?: string
  /**
   * if ethtxid/web3url not provided. Block number of transaction including freezeBurnERC20() call
   */
  blocknumber?: number
  /**
   * if ethtxid/web3url not provided. Buffer value of the transaction hex encoded in RLP format
   */
  txvalue?: Buffer
  /**
   * if ethtxid/web3url not provided. Buffer value of the transaction merkle root encoded in RLP format
   */
  txroot?: Buffer
  /**
   * if ethtxid/web3url not provided. Buffer value of the transaction merkle proof encoded in RLP format
   */
  txparentnodes?: Buffer
  /**
   * if ethtxid/web3url not provided. Buffer value of the merkle path for the transaction and receipt proof
   */
  txpath?: Buffer
  /**
   * if ethtxid/web3url not provided. Buffer value of the transaction receipt hex encoded in RLP format
   */
  receiptvalue?: Buffer
  /**
   * if ethtxid/web3url not provided. Buffer value of the receipt merkle root encoded in RLP format
   */
  receiptroot?: Buffer
  /**
   * if ethtxid/web3url not provided. Buffer value of the receipt merkle proof encoded in RLP format
   */
  receiptparentnodes?: Buffer
}

export default AssetMintOptions;