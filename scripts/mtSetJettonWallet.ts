import type { NetworkProvider, UIProvider } from '@ton/blueprint';
import { Cell, toNano, Address } from '@ton/core';
//import {ChainTypes} from '../constants/base_chain_types';
import { MultichainToken } from '../wrappers/MultichainToken';
import { sleep30 } from '../utils/sleep30';
import mtContractAddress from '../deployed/multichain.json';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import contractAddress from '../deployed/jettonMinter.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);
    
    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(mtContractAddress.multichainToken)
        ),
    );

    // For testnet
    const jettonMinter = provider.open(
        JettonMinter.createFromAddress(
            Address.parse(contractAddress.jettonMinter)
        ),
    ) ;
    // get owner's jetton wallet
    const jettonWalletAddress = await jettonMinter.getWalletAddress(multichainToken.address);
    ui.write("MultichainToken precalculated jetton wallet address "+jettonWalletAddress);

    // const jettonWallet = await ui.inputAddress('MultichainToken Jetton wallet address:');

    await multichainToken.sendSetBaseTokenWallet(sender, toNano('0.1'), {
        wallet: jettonWalletAddress,
    });
    await sleep30(ui);

    ui.write('Multichain token data:');
    await multichainToken.getData();

    ui.write('Done!');
}
