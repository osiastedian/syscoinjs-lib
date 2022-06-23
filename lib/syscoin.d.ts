import { Network } from "bitcoinjs-lib";
declare class Syscoin {
    constructor(signer: any, blockbookUrl: string, network: Network);
    signAndSend(psbt: any, notaryAssets: any, SignerIn: any, pathIn: any): Promise<void>;
}
export default Syscoin;
