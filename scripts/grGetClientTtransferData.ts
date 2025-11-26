import type { NetworkProvider } from '@ton/blueprint';
import { Address } from '@ton/core';
import { AsterizmClientTransfer } from '../wrappers/AsterizmClientTransfer';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const contractAddress = await ui.input('Contract address:');

    const clientTransfer = provider.open(
        AsterizmClientTransfer.createFromAddress(
            Address.parse(contractAddress)
        ),
    );
    ui.write('Asterizm client transfer data:');
    await clientTransfer.getData();

    ui.write('Done!');
}
