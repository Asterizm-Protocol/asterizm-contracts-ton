import type { NetworkProvider } from '@ton/blueprint';
import { Address } from '@ton/core';
import { AsterizmTranslator } from '../wrappers/AsterizmTranslator';
import contractAddress from '../deployed/core.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const relay = provider.open(
        AsterizmTranslator.createFromAddress(
            Address.parse(contractAddress.translator)
        ),
    );
    ui.write('Relay data:');
    await relay.getData();

    ui.write('Done!');
}
