import { Blockchain } from '@ton/sandbox';
import { toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Granter, ZeroAddress } from '../wrappers/Granter';

import { JettonMinter, jettonContentToCell } from '../wrappers/jettons/JettonMinter';
import { JettonWallet } from '../wrappers/jettons/JettonWallet';

describe('Integeration', () => {
    it('Integeration deploy', async () => {
        const blockchain = await Blockchain.create();

        let deployer = await blockchain.treasury('deployer');

        // Deploy Jetton Minter
        const content = jettonContentToCell({type:1,uri:"https://example.com"});
        const wallet_code = await compile('/jettons/JettonWallet');
        const minter  = blockchain.openContract(
            JettonMinter.createFromConfig({
                    admin: deployer.address,
                    content,
                    wallet_code,
                },
                await compile('/jettons/JettonMinter')
            )
        );

        const minterDeployResult = await minter.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(minterDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: minter.address,
            deploy: true,
            success: true,
        });

        // Deploy granter
        const granter  = blockchain.openContract(
            Granter.createFromConfig({
                    owner: deployer.address,
                    wallet: ZeroAddress,
                },
                await compile('/Granter')
            )
        );

        const granterDeployResult = await granter.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(granterDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: granter.address,
            deploy: true,
            success: true,
        });

        let res = await granter.getStateVariables();
        expect(res.owner.toRawString()).toEqual(deployer.address.toRawString());
        expect(res.wallet.toRawString()).toEqual(ZeroAddress.toRawString());

        // Get granter jetton wallet
        const granterJettonWalletAddress = await minter.getWalletAddress(granter.address);

        // Set granter jetton wallet address
        const granterSendSetAddressResult = await granter.sendSetAddress(
            deployer.getSender(),
            toNano('0.05'),
            granterJettonWalletAddress
        );
        res = await granter.getStateVariables();
        expect(res.owner.toRawString()).toEqual(deployer.address.toRawString());
        expect(res.wallet.toRawString()).toEqual(granterJettonWalletAddress.toRawString());

        // Mint tokens to granter
        const mint_value = toNano('1000000');
        await minter.sendMint(deployer.getSender(),
            granter.address,
            mint_value,
            toNano('0.05'),
            toNano('0.1')
        );

        // Get granter jetton balance
        const granterJettonWallet  = blockchain.openContract(
            JettonWallet.createFromAddress(granterJettonWalletAddress)
        );
        const granter_balance = await granterJettonWallet.getJettonBalance();
        expect(granter_balance).toEqual(mint_value);

        // Get user
        const user = await blockchain.treasury('user');

        // User call grant()
        const granterSendGrantResult = await granter.sendGrant(user.getSender(), toNano('0.05'));

        // Get user jetton wallet
        const userJettonWalletAddress = await minter.getWalletAddress(user.address);
        // Get user jetton balance
        const userJettonWallet  = blockchain.openContract(
            JettonWallet.createFromAddress(userJettonWalletAddress)
        );
        const user_balance = await userJettonWallet.getJettonBalance();
        expect(user_balance).toEqual(toNano('100'));
    });
});
