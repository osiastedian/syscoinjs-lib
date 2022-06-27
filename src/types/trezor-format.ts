export interface TrezorTxInput {
  prev_index: number
  prev_hash: string
  address_n?: number[]
  script_type?: string
  sequence?: number
}

export interface TrezorTxOutput {
  amount: string
  address?: string
  op_return_data?: string
  script_type?: string
}

export interface TrezorTx {
  coin: string
  version: number
  inputs: TrezorTxInput[]
  outputs: TrezorTxOutput[]
}
