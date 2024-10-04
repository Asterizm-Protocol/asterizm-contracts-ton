import type { NetworkProvider } from '@ton/blueprint';
import {toNano, Address} from '@ton/core';
import { sleep30 } from '../utils/sleep30';
import {AsterizmTranslator} from "../wrappers/AsterizmTranslator";
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

    const relayerAddress = await ui.inputAddress('Relayer address: ');

    await translator.sendAddRelayer(sender, toNano('0.1'), {
        relayerAddress: relayerAddress
    });
    await sleep30(ui);

    ui.write('Relay contract data:');
    await translator.getData();

    ui.write('Done!');
}
