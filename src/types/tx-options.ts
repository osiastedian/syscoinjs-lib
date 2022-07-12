export interface TxOptions {
  /**
   * True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used. Will be overrided to False, cannot be set to True for new asset transactions.
   */
  rbf: boolean
  /**
   * null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
   */
  assetWhiteList?: Map<string, Object>
}

export default TxOptions
