import { TonClient, Signer, signerNone } from '@eversdk/core';
import {libNode} from "@eversdk/lib-node";
// Application initialization
TonClient.useBinaryLibrary(libNode)

export async function createInitialData(abi: any, calldata: any): Promise<string> {
    const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            })
    const keys = await client.crypto.generate_random_sign_keys();
    const res = await client.abi.encode_initial_data({
        abi: {
            type: 'Contract',
            value: abi
        },
        initial_pubkey: keys.public,
        initial_data: calldata,
    });
    client.close();
    return res.data;
}