export interface NotaryDetails {
    endpoint: string | Buffer;
    instanttransfers: boolean,
    hdrequired: boolean
}

export interface NotaryAsset {
    notarydone: boolean
    notarydetails: NotaryDetails
    [key: string]: any // account for any other properties
}