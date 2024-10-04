import type { NetworkProvider, UIProvider } from '@ton/blueprint';
import { Cell, toNano, Address } from '@ton/core';
//import {ChainTypes} from '../constants/base_chain_types';
import { MultichainToken } from '../wrappers/MultichainToken';
import multichainTokenAddress from '../deployed/multichain.json';
import { sleep30 } from '../utils/sleep30';
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(multichainTokenAddress.multichainToken)
        ),
    );
    
    // mock value
    const sendValue = 100n;
    const from = Address.parse('0:1111000000000000000000000000000000000000000000000000000000001111');
    const to = Address.parse('0:2222000000000000000000000000000000000000000000000000000000002222');
    ui.write('Sending crosschain transfer...');
    await multichainToken.sendDebugCrossChainTransfer(sender, toNano('1'), {
        dstChainId: 11155111,
        from,
        to,
        amount: sendValue,
    });
    await sleep30(ui);

    ui.write('Multichain token data:');
    await multichainToken.getData();
    ui.write('Done!');
}