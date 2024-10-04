import { TonClient, signerNone } from '@eversdk/core';
import {libNode} from "@eversdk/lib-node";
// Application initialization
TonClient.useBinaryLibrary(libNode)

export async function encodeMessageBody(abi: any, functionName: string, params: any) {
    const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            })
    const res = await client.abi.encode_message_body({
        abi: {
            type: 'Contract',
            value: abi
        },
        call_set: {
            function_name: functionName,
            input: params,
        },
        signer: signerNone(),
        is_internal: true,
    });
    client.close();
    return res.body;
}

export async function encodeMessage(abi: any, account_id: string, functionName: string, params: any) {
    const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            })
    const res = await client.abi.encode_message({
        abi: {
            type: 'Contract',
            value: abi
        },
        address: '0:'+account_id,
        call_set: {
            function_name: functionName,
            input: params,
        },
        signer: signerNone(),
    });
    //console.log(res);
    client.close();
    return res.message;
}