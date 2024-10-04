import { TonClient, signerNone } from '@eversdk/core';
import {libNode} from "@eversdk/lib-node";
// Application initialization
TonClient.useBinaryLibrary(libNode)

export async function decodeMessageBody(abi: any, body: string) {
    const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            })

    const res = await client.abi.decode_message_body({
        abi: {
            type: 'Contract',
            value: abi
        },
        body,
        is_internal: false,
    });
    client.close();
    return res;
}