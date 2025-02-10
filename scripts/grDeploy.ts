import { NetworkProvider, UIProvider, compile } from '@ton/blueprint';
import { Cell, toNano, Address } from '@ton/core';
import { Granter, ZeroAddress } from '../wrappers/Granter';
import { sleep30 } from '../utils/sleep30';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import { saveJson } from '../utils/saveJson';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    const jettonMinterAddress = await ui.inputAddress('Corresponding Jetton minter address:');
    // Deploy granter
    ui.write('Deploying granter...');
    const granter  = provider.open(
        await Granter.createFromConfig({
                owner,
                wallet: ZeroAddress,
            }, 
            await compile('/Granter')
        )
    );
    await granter.sendDeploy(sender, toNano('0.1'));
    await provider.waitForDeploy(granter.address, 100, 10000);
    ui.write('Granter address: ' + granter.address);

    // set Granter jetton wallet address
    ui.write('Set Granter jetton wallet address...');
    const jettonMinter = provider.open(
        JettonMinter.createFromAddress(
            jettonMinterAddress
        ),
    ) ;
    // get granter jetton wallet
    const jettonWalletAddress = await jettonMinter.getWalletAddress(granter.address);
    ui.write("Granter precalculated jetton wallet address "+jettonWalletAddress);

    // Set granter jetton wallet address
    await granter.sendSetAddress(
        sender,
        toNano('0.05'), 
        jettonWalletAddress
    );
    await sleep30(ui);

    // mint tokens to granter
    ui.write('Minting tokens to granter...');
    const mint_value = toNano('1000000000');
    await jettonMinter.sendMint(sender, granter.address, mint_value, toNano('0.05'), toNano('0.1'));
    ui.write('Minted tokens to granter');
    await sleep30(ui);
    
    //save to json
    await saveJson('deployed/granter.json', {
        granter: granter.address.toString(),
        granterJettonWallet: jettonWalletAddress.toString(),
        minter: jettonMinterAddress.toString(),
        owner: owner.toString(),
    });
    // Done
    ui.write('Deployed successfully!');
}
