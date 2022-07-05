export interface NotaryDetails {
  endpoint: string | Buffer
  instanttransfers: boolean
  hdrequired: boolean
}

export interface NotaryAsset extends Record<string, any> {
  notarydone: boolean
  notarydetails: NotaryDetails
}
