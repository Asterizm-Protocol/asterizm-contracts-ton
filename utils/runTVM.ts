import { TonClient, signerNone, accountForExecutorAccount } from '@eversdk/core';
import {libNode} from "@eversdk/lib-node";
// Application initialization
TonClient.useBinaryLibrary(libNode)

export async function makeAccountBoc(data: string, code: string) {
    const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            });
    
    const res = await client.boc.encode_state_init({
        code,
        data,
    });
    const res1 = await client.abi.encode_account({
        state_init:res.state_init
    });

    const rr = await client.boc.parse_account({boc: res1.account});
    console.log(rr);
    client.close();

    console.log(res1.id)
    
    return {
        boc: rr.parsed.boc,
        id: rr.parsed.id
    }
}
export async function runTVM(message: string, account: string, abi: any) {
    const client = 
            new TonClient({
                network: {
                    endpoints: [
                        "127.0.0.1:3030"
                    ],
                },
            });
    console.log(message,account);
    const res = await client.tvm.run_tvm({
        message,
        account,
        abi: {
            type: 'Contract',
            value: abi
        },  
    });
    /*const res = await client.tvm.run_executor({
        message,
        account: accountForExecutorAccount(account, true),
        abi: {
            type: 'Contract',
            value: abi
        },
    });*/
    client.close();
    console.log(res);
    return res.decoded;
}