import { Blockchain } from '@ton/sandbox';
import { toNano, Address, beginCell } from '@ton/core';
import '@ton/test-utils';
import { JettonWallet } from '../wrappers/jettons/JettonWallet';

import { integrationDeploy } from './src/IntegrationDeploy';


describe('Integeration-jettons', () => {
    it('Integeration deploy', async () => {

        const blockchain = await Blockchain.create();

        const { 
            deployer, 
            user, 
            minter,
            mint_value,
            userJettonWallet, 
            multichainToken, 
            mtJettonWallet 
        } = await integrationDeploy(blockchain);

        // transfer to multichain token JettonWallet
        // it leads to crossChainTransfer call
        const sendValue = toNano('5');
        const forwardPayload = beginCell()
            .storeUint(11155111, 64)
            .storeUint(BigInt("0x1234"),256)
            .endCell();
        await userJettonWallet.sendTransfer(
            user.getSender(),
            toNano('0.065'),
            sendValue,
            multichainToken.address,
            Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
            beginCell().endCell(), //customPayload: Cell,
            toNano('0.02'),//forward_ton_amount: bigint,
            forwardPayload
        )

        expect(await mtJettonWallet.getJettonBalance()).toEqual(sendValue);
        expect(await userJettonWallet.getJettonBalance()).toEqual(sendValue);
        expect(BigInt(await multichainToken.getTokenBalance()).toString())
        .toEqual(sendValue.toString());
        // Send tokens back to user wallet
        // Debug Transfer is diable now
        /*await multichainToken.sendDebugTransfer(deployer.getSender(), toNano('1'), {
            dst: user.address,
            amount: sendValue,
        });
        expect((await mtJettonWallet.getJettonBalance()).toString()).toEqual(0n.toString());
        expect((await userJettonWallet.getJettonBalance()).toString()).toEqual(toNano('10').toString());
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual('0');
            

        // send tokens to new user address
        let newUser = await blockchain.treasury('newUser');
        const newUserJettonWalletAddress = await minter.getWalletAddress(newUser.address);
        const newUserJettonWallet  = blockchain.openContract(
            JettonWallet.createFromAddress(newUserJettonWalletAddress)
        );

        // transfer to multichain token JettonWallet
        // it leads to crossChainTransfer call
        const newUserSendValue = toNano('7');
        //const newUserSendBackValue = toNano('3');
        const newUserForwardPayload = beginCell()
            .storeUint(11155111, 64)
            .storeAddress(Address.parse('0:2222000000000000000000000000000000000000000000000000000000002222'))
            .endCell();
        await userJettonWallet.sendTransfer(
            user.getSender(),
            toNano('0.065'),
            newUserSendValue,
            multichainToken.address,
            Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
            beginCell().endCell(), //customPayload: Cell,
            toNano('0.02'),//forward_ton_amount: bigint,
            newUserForwardPayload
        )
        console.log('ok');
        expect((await mtJettonWallet.getJettonBalance()).toString()).toEqual(newUserSendValue.toString());
        expect((await userJettonWallet.getJettonBalance()).toString()).toEqual((mint_value - newUserSendValue).toString());
        expect(BigInt(await multichainToken.getTokenBalance()).toString())
        .toEqual(newUserSendValue.toString());
        // Send tokens back to new user wallet
        await multichainToken.sendDebugTransfer(deployer.getSender(), toNano('1'), {
            dst: newUser.address,
            amount: newUserSendBackValue,
        });
        expect((await mtJettonWallet.getJettonBalance())).toEqual(newUserSendValue - newUserSendBackValue);
        expect((await userJettonWallet.getJettonBalance())).toEqual(mint_value - newUserSendValue);
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual((newUserSendValue - newUserSendBackValue).toString());
        expect((await newUserJettonWallet.getJettonBalance())).toEqual(newUserSendBackValue);
        */
    });
});
