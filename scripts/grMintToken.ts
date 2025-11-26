import { NetworkProvider } from '@ton/blueprint';
import { toNano, Address } from '@ton/core';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import contractAddress from "../deployed/granterMinter.json";

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    const jettonMinter = provider.open(
        JettonMinter.createFromAddress(
            Address.parse(contractAddress.minter)
        ),
    );

    const mintAmount = await ui.input('Mint token amount:');
    const targetAddress = await ui.inputAddress('Target address amount (without decimals):');
    // mint tokens to granter
    ui.write('Minting tokens to target...');
    await jettonMinter.sendMint(sender, targetAddress, toNano(mintAmount), toNano('0.05'), toNano('0.1'));

    // Done
    ui.write('Minting successfully!');
}
