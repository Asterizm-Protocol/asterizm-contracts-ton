import type { NetworkProvider } from '@ton/blueprint';
import {Address, toNano} from '@ton/core';
import { AsterizmInitializer } from '../wrappers/AsterizmInitializer';
import contractAddress from '../deployed/core.json';
import {sleep30} from "../utils/sleep30";

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address: ' + owner);

    const initializer = provider.open(
        AsterizmInitializer.createFromAddress(
            Address.parse(contractAddress.initializer)
        ),
    );

    await initializer.sendUpdateChainsList(sender, toNano('2'));
    await sleep30(ui);

    ui.write('Initializer data:');
    await initializer.getData();

    ui.write('Done!');
}
