import { Network } from "./types/network";
declare class Syscoin {
    constructor(signer: any, blockbookUrl: string, network: Network);
    signAndSend(psbt: any, notaryAssets: any, SignerIn: any, pathIn: any): Promise<void>;
}
export default Syscoin;
