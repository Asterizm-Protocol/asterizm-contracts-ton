import type { NetworkProvider } from '@ton/blueprint';
import { toNano, Address } from '@ton/core';
import mtContractAddress from '../deployed/multichain.json';
import coreContractAddress from '../deployed/core.json';
import { AsterizmInitializer } from '../wrappers/AsterizmInitializer';


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    
    const initializer = provider.open(
        AsterizmInitializer.createFromAddress(
            Address.parse(coreContractAddress.initializer)
        ),
    );  
    
    const txHash = await ui.input('Transfer txHash (0x22):');
    const txId = await ui.input('Transfer txId (0x1): ');
    const dstFeeAmount = await ui.input('Transfer dstFeeAmount (0x1): ');

    const rcvDstAddress = '0x'+Address.parse(mtContractAddress.multichainToken).hash.toString('hex'); 
    await initializer.sendInitTransfer(
        sender, 
        toNano('0.1'),
        {
            dstChainId: 40000n,
            dstAddress: BigInt(rcvDstAddress),
            transferHash: BigInt(txHash),
            txId: BigInt(txId),
            dstFeeAmount: BigInt(dstFeeAmount),
            relay: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000').toRawString(),
            transferResultNotifyFlag: false,
        }
    );

    ui.write('Done!');
}
