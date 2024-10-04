import type { NetworkProvider } from '@ton/blueprint';
import { toNano, Address } from '@ton/core';
import { MultichainToken } from '../wrappers/MultichainToken';
import { sleep30 } from '../utils/sleep30';
import mtContractAddress from '../deployed/multichain.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(mtContractAddress.multichainToken)
        ),
    );

    const chainId = await ui.input('Chain ID: ');
    const trustedAddress = await ui.input('Trusted address: ');

    // const trustedAddress = '0x'+addr.hash.toString('hex');
    await multichainToken.sendAddTrustedAddress(sender, toNano('0.1'), {
        chainId: parseInt(chainId),
        trustedAddress: trustedAddress,
    });
    await sleep30(ui);

    ui.write('Multichain token data:');
    await multichainToken.getData();

    ui.write('Done!');
}
