import { ContractProvider } from '@ton/core';
import { TonClient } from '@eversdk/core';
import {libNode} from "@eversdk/lib-node";
// Application initialization
TonClient.useBinaryLibrary(libNode)

export async function decodeAccountData(abi: any, provider: ContractProvider) {
    const state = await provider.getState();
    if (state.state.type == "active") {
        const data = state.state.data!.toString('base64');
        const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            })

        const res = await client.abi.decode_account_data({
            abi: {
                type: 'Contract',
                value: abi
            },
            data: data,
        });

        client.close();

        return res.data;
    }
}