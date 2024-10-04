import type { NetworkProvider, UIProvider } from '@ton/blueprint';
import { toNano, Address, beginCell } from '@ton/core';
//import {ChainTypes} from '../constants/base_chain_types';
import { JettonWallet } from '../wrappers/jettons/JettonWallet';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import contractAddress from '../deployed/jettonMinter.json';
import mtContractAddress from '../deployed/multichain.json';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('Owner address '+owner);

    const jettonMinter = provider.open(
        JettonMinter.createFromAddress(
            Address.parse(contractAddress.jettonMinter)
        ),
    ) ;
    // get owner's jetton wallet
    const jettonWalletAddress = await jettonMinter.getWalletAddress(owner);
    ui.write("Owner's jetton wallet address "+jettonWalletAddress);

    // open jetton wallet
    const jettonWallet = provider.open(
        JettonWallet.createFromAddress(
            jettonWalletAddress
        ),
    );

    const dstChain = await ui.input('Dst Chain: ');
    const dstAddress = await ui.input('Dst Address (in uint): ');
    const amout = await ui.input('Jetton amount (no decimals): ');
    const to = Address.parse(mtContractAddress.multichainToken);
    const jetton_amount = BigInt(amout);
    const forwardPayload = beginCell()
        .storeUint(Number(dstChain), 64)
        .storeUint(BigInt(dstAddress),256)
        .endCell();

    // send jetton transfer to multichain token with payload
    await jettonWallet.sendTransfer(
        sender,
        toNano('0.065'),
        jetton_amount,
        to,
        Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
        beginCell().endCell(), //customPayload: Cell,
        toNano('0.02'),//forward_ton_amount: bigint,
        forwardPayload
    )

    ui.write('Done!');
}
