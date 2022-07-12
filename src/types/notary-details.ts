export interface NotaryDetails {
  /**
   * Fully qualified URL of the notary endpoint. The endpoint will be sent a POST request with transaction hex and some other details in a JSON object and requires a signature signing the transaction following notarization protocol.
   */
  endpoint: string | Buffer
  /**
   * Default is 0 (false). Instant transfers by blocking double-spends from inputs. Since notarization is happening via API the API can block any double-spend attempts thereby allowing for instant transactions.
   */
  instanttransfers: number
  /**
   * Optional. Default is 0 (false). If HD account XPUB and HD path information is required by the notary to verify change addresses belong to the sender account.
   */
  hdrequired: number
}

export interface NotaryAsset extends Record<string, any> {
  notarydone: boolean
  notarydetails: NotaryDetails
}
