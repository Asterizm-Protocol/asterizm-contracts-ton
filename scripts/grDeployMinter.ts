import { NetworkProvider, compile } from '@ton/blueprint';
import { toNano } from '@ton/core';
import { JettonMinter, jettonContentToCell } from '../wrappers/jettons/JettonMinter';
import { saveJson } from '../utils/saveJson';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    // Deploy granter
    ui.write('Deploying minter...');
    const content = jettonContentToCell({type:1,uri:"https://example.com/1"});
    const wallet_code = await compile('/jettons/JettonWallet');
    const minter  = provider.open(
        JettonMinter.createFromConfig({
                admin: owner,
                content,
                wallet_code,
            }, 
            await compile('/jettons/JettonMinter')
        )
    );

    await minter.sendDeploy(sender, toNano('1'));
    await provider.waitForDeploy(minter.address, 100, 10000);
    ui.write('Minter address: ' + minter.address);

    //save to json
    await saveJson('deployed/granterMinter.json', {
        minter: minter.address.toString(),
        owner: owner.toString(),
    });
    // Done
    ui.write('Deployed successfully!');
}
