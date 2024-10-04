import type { NetworkProvider } from '@ton/blueprint';
import {toNano, Address, Cell} from '@ton/core';
import { MultichainToken } from '../wrappers/MultichainToken';
import { sleep30 } from '../utils/sleep30';
import mtContractAddress from '../deployed/multichain.json';
import coreContractAddress from '../deployed/core.json';
import {AsterizmInitializer} from "../wrappers/AsterizmInitializer";
import asterizmInitializerTransferCode from "../contracts/artifacts/AsterizmInitializerTransfer.code.json";
import asterizmClientTransferCode from "../contracts/artifacts/AsterizmClientTransfer.code.json";
import AsterizmInitializerCode from "../contracts/artifacts/AsterizmInitializer.code.json";

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);


    const initializer = provider.open(
        await AsterizmInitializer.createFromAddress(
            Address.parse(coreContractAddress.initializer)
        )
    );

    await initializer.sendUpdateChainsList(sender, toNano('2'));
    await sleep30(ui);

    ui.write('Initializer data:');
    await initializer.getData();


    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(mtContractAddress.multichainToken)
        ),
    );

    await multichainToken.sendUpdateChainsList(
        sender,
        toNano('1')
    );
    await sleep30(ui);

    ui.write('Multichain token data:');
    await multichainToken.getData();

    ui.write('Done!');
}
