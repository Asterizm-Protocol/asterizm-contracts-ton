import type { NetworkProvider } from '@ton/blueprint';
import { Address } from '@ton/core';
import { MultichainToken } from '../wrappers/MultichainToken';
import contractAddress from '../deployed/multichain.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
   
    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(contractAddress.multichainToken)
        ),
    );
    ui.write('Multichain token data:');
    await multichainToken.getData();

    ui.write('Done!');
}