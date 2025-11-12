import type { NetworkProvider, UIProvider } from '@ton/blueprint';
import { Cell, toNano, Address } from '@ton/core';
import { MultichainToken } from '../wrappers/MultichainToken';
import MultichainTokenCode from '../contracts/artifacts/MultichainToken.code.json';
import asterizmCoreContracts from '../deployed/core.json';
import { sleep30 } from '../utils/sleep30';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import minterContract from '../deployed/jettonMinter.json';
import { saveJson } from '../utils/saveJson';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    const initializer = Address.parse(asterizmCoreContracts.initializer);
    ui.write('Initializer address '+initializer.toString());

    // Deploy multichain token
    ui.write('Deploying multichain token...');
    const multichainToken = provider.open(
        await MultichainToken.createFromConfig(
            {
                owner: owner,
                initializerLib: initializer,
                notifyTransferSendingResult: false,
                disableHashValidation: false,
                hashVersion: 1,
            },
            Cell.fromBase64(MultichainTokenCode.code),
        )
    );

    await multichainToken.sendConstructor(sender, toNano('2'));
    await provider.waitForDeploy(multichainToken.address, 100, 10000);
    ui.write('Multichain token address: ' + multichainToken.address);

    // initialize multichain token
    ui.write('Initializing multichain token...');
    await multichainToken.sendInitialize(sender, toNano('5'));
    await sleep30(ui);

    // set MultichainToken jetton wallet address
    ui.write('Set jetton wallet address...');
    const jettonMinter = provider.open(
        JettonMinter.createFromAddress(
            Address.parse(minterContract.jettonMinter)
        ),
    ) ;
    // get owner's jetton wallet
    const jettonWalletAddress = await jettonMinter.getWalletAddress(multichainToken.address);
    ui.write("MultichainToken precalculated jetton wallet address "+jettonWalletAddress);

    await multichainToken.sendSetBaseTokenWallet(sender, toNano('0.1'), {
        wallet: jettonWalletAddress,
    });
    await sleep30(ui);
    
    ui.write('Multichain token data:');
    await multichainToken.getData();
    ui.write('Multichain token address: ' + multichainToken.address);
    await saveJson('deployed/multichain.json', {
        multichainToken: multichainToken.address.toString(),
    })
    ui.write('Deployed successfully!');
}
