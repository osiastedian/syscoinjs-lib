import bjs, { Network, Psbt } from 'bitcoinjs-lib'

export function copyPSBT(
  psbt: Psbt,
  networkIn: Network,
  outputIndexToModify: number,
  outputScript: Buffer | string
): Psbt {
  const psbtNew = new bjs.Psbt({ network: networkIn })
  psbtNew.setVersion(psbt.version)
  const { txInputs } = psbt
  for (let i = 0; i < txInputs.length; i++) {
    const input = txInputs[i]
    const dataInput = psbt.data.inputs[i]
    const inputObj = {
      hash: input.hash,
      index: input.index,
      sequence: input.sequence,
      bip32Derivation: dataInput.bip32Derivation || [],
      witnessUtxo: null,
      nonWitnessUtxo: null,
    }
    if (dataInput.nonWitnessUtxo) {
      inputObj.nonWitnessUtxo = dataInput.nonWitnessUtxo
    } else if (dataInput.witnessUtxo) {
      inputObj.witnessUtxo = dataInput.witnessUtxo
    }
    psbtNew.addInput(inputObj)
    dataInput.unknownKeyVals.forEach((unknownKeyVal) => {
      psbtNew.addUnknownKeyValToInput(i, unknownKeyVal)
    })
  }
  const { txOutputs } = psbt
  for (let i = 0; i < txOutputs.length; i++) {
    const output = txOutputs[i]
    if (i === outputIndexToModify) {
      psbtNew.addOutput({
        script: outputScript as Buffer,
        address: outputScript as string,
        value: output.value,
      })
    } else {
      psbtNew.addOutput(output)
    }
  }
  return psbtNew
}

export default copyPSBT
