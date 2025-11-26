import type { NetworkProvider } from '@ton/blueprint';
import { Address } from '@ton/core';
import { AsterizmInitializer } from '../wrappers/AsterizmInitializer';
import contractAddress from '../deployed/core.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const initializer = provider.open(
        AsterizmInitializer.createFromAddress(
            Address.parse(contractAddress.initializer)
        ),
    );
    ui.write('Initializer data:');
    await initializer.getData();

    ui.write('Done!');
}
