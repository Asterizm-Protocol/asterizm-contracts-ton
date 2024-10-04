import type { NetworkProvider } from '@ton/blueprint';
import {toNano, Address} from '@ton/core';
import { sleep30 } from '../utils/sleep30';
import {AsterizmTranslator} from "../wrappers/AsterizmTranslator";
import coreContractAddress from '../deployed/core.json';
import {ChainTypes} from '../constants/base_chain_types';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address: ' + owner);

    const translator = provider.open(
        AsterizmTranslator.createFromAddress(
            Address.parse(coreContractAddress.translator)
        ),
    );

    const chainId = await ui.input('Chain ID: ');
    const chainType = await ui.input('Chain type (1 - evm, 2 - tvm, 3 - ton, 4 - sol): ');

    await translator.sendAddChain(sender, toNano('0.1'), parseInt(chainId), parseInt(chainType));
    await sleep30(ui);

    ui.write('Relay contract data:');
    await translator.getData();

    ui.write('Done!');
}
