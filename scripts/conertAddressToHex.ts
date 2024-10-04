import type { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    const srcAddress = await ui.inputAddress('Source address:');

    const dstAddress = '0x' + srcAddress.hash.toString('hex');

    ui.write('Client contract data: ' + dstAddress);

    ui.write('Done!');
}
