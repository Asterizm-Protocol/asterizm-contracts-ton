import { NetworkProvider, UIProvider, compile } from '@ton/blueprint';
import { Cell, toNano, Address } from '@ton/core';
import { Granter } from '../wrappers/Granter';
import { sleep30 } from '../utils/sleep30';
import granterAddress from '../deployed/granter.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    // Get granter
    const granter = provider.open(
        Granter.createFromAddress(
            Address.parse(granterAddress.granter)
        ),
    );
    // Call grant
    ui.write('Calling grant...');
    await granter.sendGrant(sender, toNano('0.05'));
    await sleep30(ui);
    // Done
    ui.write('Done!');
}
