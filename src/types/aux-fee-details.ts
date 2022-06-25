export interface AuxFeeDetails {
  auxFeeKeyID: string;
  auxFees: AuxFee[];
}

export interface AuxFee {
  bound: number;
  percent: number;
}

export interface SanitizedAuxFeeDetails {
  auxfeekeyid: Buffer;
  auxfees: AuxFee[];
  auxfeeaddress?: string;
}
