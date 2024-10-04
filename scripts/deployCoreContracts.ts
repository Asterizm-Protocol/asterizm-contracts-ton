import type { NetworkProvider, UIProvider } from '@ton/blueprint';
import { Cell, toNano } from '@ton/core';
import {ChainTypes} from '../constants/base_chain_types';
import { AsterizmTranslator } from '../wrappers/AsterizmTranslator';
import AsterizmTranslatorCode from '../contracts/artifacts/AsterizmTranslator.code.json';

import { AsterizmInitializer } from '../wrappers/AsterizmInitializer';
import AsterizmInitializerCode from '../contracts/artifacts/AsterizmInitializer.code.json';
import asterizmClientTransferCode from '../contracts/artifacts/AsterizmClientTransfer.code.json';
import asterizmInitializerTransferCode from '../contracts/artifacts/AsterizmInitializerTransfer.code.json';
import { sleep30 } from '../utils/sleep30';
import { saveJson } from '../utils/saveJson';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    // Deploy Asterizm Translator
    ui.write('Deploying translator...');
    const translator = provider.open(
        await AsterizmTranslator.createFromConfig(
            owner,
            Cell.fromBase64(AsterizmTranslatorCode.code),
        )
    );
    await translator.sendConstructor(sender, toNano('2'));
    await provider.waitForDeploy(translator.address, 100, 10000);
    ui.write('Translator address: ' + translator.address);

    // add sepolia chain to translator
    ui.write('Adding chain to translator...');
    await translator.sendAddChain(sender, toNano('2'), 11155111, ChainTypes.EVM);
    await sleep30(ui);

    // Deploy Asterizm Initializer
     ui.write('Deploying initializer...');
    const initializer = provider.open(
        await AsterizmInitializer.createFromConfig(
            {
                initializerTransferCode: asterizmInitializerTransferCode.code,
                clientTransferCode: asterizmClientTransferCode.code,
                translator: translator.address,
                owner: owner,
            },
            Cell.fromBase64(AsterizmInitializerCode.code),
        )
    );

    await initializer.sendConstructor(sender, toNano('2'));
    await provider.waitForDeploy(initializer.address, 100, 10000);
    ui.write('Initializer address: ' + initializer.address);

    // update initializer chains
    ui.write('Updating chains...');
    await initializer.sendUpdateChainsList(sender, toNano('2'));   
    await sleep30(ui);
    
    // update initializer local chain
    ui.write('Updating local chain...');
    await initializer.sendUpdateLocalChainId(sender, toNano('2')); 
    await sleep30(ui);
    
    // set initializer to translator
    ui.write('Setting initializer...');
    await translator.sendSetInitializer(sender, toNano('2'), initializer.address);
    await sleep30(ui);

    ui.write('Translator data:');
    await translator.getData();
    ui.write('Initializer data:');
    await initializer.getData();
    ui.write('Translator address: ' + translator.address);
    ui.write('Initializer address: ' + initializer.address);

    await saveJson('deployed/core.json', {
        translator: translator.address.toString(),
        initializer: initializer.address.toString(),
    })
    ui.write('Deployed successfully!');
}
