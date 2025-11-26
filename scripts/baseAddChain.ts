import type { NetworkProvider } from '@ton/blueprint';
import {toNano, Address} from '@ton/core';
import { sleep30 } from '../utils/sleep30';
import { AsterizmTranslator } from "../wrappers/AsterizmTranslator";
import coreContractAddress from '../deployed/core.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address: ' + owner);

    const translator = provider.open(
        AsterizmTranslator.createFromAddress(
            Address.parse(coreContractAddress.translator)
        ),
    );

    const chainId = Number(await ui.input('Chain ID: '));
    const chainType = Number(await ui.input('Chain type (see available types in ChainTypes): '));

    await translator.sendAddChain(sender, toNano('2'), chainId, chainType);
    await sleep30(ui);

    ui.write('Relay contract data:');
    await translator.getData();

    ui.write('Done!');
}
