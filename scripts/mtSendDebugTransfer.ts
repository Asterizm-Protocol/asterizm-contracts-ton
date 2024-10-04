import type { NetworkProvider, UIProvider } from '@ton/blueprint';
import { toNano, Address } from '@ton/core';
//import {ChainTypes} from '../constants/base_chain_types';
import { MultichainToken } from '../wrappers/MultichainToken';
import contractAddress from '../deployed/multichain.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    
    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(contractAddress.multichainToken)
        ),
    );

    const amout = await ui.input('Jetton amount (no decimals):'); 

    await multichainToken.sendDebugTransfer(
        sender,
        toNano('1'),
        {
            amount: BigInt(amout),
            dst: owner,
        }
    )

    ui.write('Done!');
}