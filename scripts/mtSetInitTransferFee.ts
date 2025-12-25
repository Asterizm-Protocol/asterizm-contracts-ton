import type { NetworkProvider } from '@ton/blueprint';
import { toNano, Address } from '@ton/core';
import { MultichainTokenWR } from '../wrappers/MultichainTokenWR';
import { sleep30 } from '../utils/sleep30';
import mtContractAddress from '../deployed/multichain.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    const multichainToken = provider.open(
        MultichainTokenWR.createFromAddress(
            Address.parse(mtContractAddress.multichainToken)
        ),
    )

    const feeAmount = await ui.input('MultichainToken initialization transfer fee (with decimals):');

    await multichainToken.sendSetInitTransferFee(sender, toNano('0.5'), {
        feeAmount: feeAmount,
    });
    await sleep30(ui);

    ui.write('Multichain token data:');
    await multichainToken.getData();

    ui.write('Done!');
}
