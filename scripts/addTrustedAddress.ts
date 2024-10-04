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
    //0:d63659b27081e7af87bb23bcb03c45b95a9d06fe089c15c0dfd5e365dde32183
    ui.write('0:d63659b27081e7af87bb23bcb03c45b95a9d06fe089c15c0dfd5e365dde32183');
    const chainId = await ui.input('Chain ID: ');
    const addressUint = await ui.input('Trusted address (uint): ');

    await multichainToken.sendAddTrustedAddress(sender, toNano('0.1'), {
        chainId: Number(chainId),
        trustedAddress: addressUint,
    });
    await sleep30(ui);

    ui.write('Client contract data:');
    await multichainToken.getData();

    ui.write('Done!');
}