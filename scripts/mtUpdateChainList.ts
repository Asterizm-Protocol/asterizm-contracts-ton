import type { NetworkProvider } from '@ton/blueprint';
import {Address, toNano} from '@ton/core';
import { MultichainTokenWR } from '../wrappers/MultichainTokenWR';
import contractAddress from '../deployed/multichain.json';
import {sleep30} from "../utils/sleep30";

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address: ' + owner);

    const token = provider.open(
        MultichainTokenWR.createFromAddress(
            Address.parse(contractAddress.multichainToken)
        ),
    );

    await token.sendUpdateChainsList(sender, toNano('1'));
    await sleep30(ui);

    ui.write('Multichain token data:');
    await token.getData();

    ui.write('Done!');
}
