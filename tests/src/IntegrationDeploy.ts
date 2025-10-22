import { Blockchain } from '@ton/sandbox';
import { Cell, toNano, } from '@ton/core';
import { compile } from '@ton/blueprint';
import '@ton/test-utils';
import {ChainTypes} from '../../constants/base_chain_types';
import { AsterizmTranslator } from '../../wrappers/AsterizmTranslator';
import AsterizmTranslatorCode from '../../contracts/artifacts/AsterizmTranslator.code.json';

import { AsterizmInitializer } from '../../wrappers/AsterizmInitializer';
import AsterizmInitializerCode from '../../contracts/artifacts/AsterizmInitializer.code.json';
import asterizmClientTransferCode from '../../contracts/artifacts/AsterizmClientTransfer.code.json';
import asterizmInitializerTransferCode from '../../contracts/artifacts/AsterizmInitializerTransfer.code.json';

import { MultichainToken } from '../../wrappers/MultichainToken';
import MultichainTokenCode from '../../contracts/artifacts/MultichainToken.code.json';

import { JettonMinter, jettonContentToCell } from '../../wrappers/jettons/JettonMinter';
import { JettonWallet } from '../../wrappers/jettons/JettonWallet';

export async function integrationDeploy(blockchain: Blockchain) {
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

    // Mint tokens to user
    const user = await blockchain.treasury('user');
    const mint_value = toNano('12');

    await minter.sendMint(deployer.getSender(),
        user.address,
        mint_value,
        toNano('0.05'),
        toNano('0.1'));

    // Get user jetton wallet
    const userJettonWalletAddress = await minter.getWalletAddress(user.address);
    // Get user jetton balance
    const userJettonWallet  = blockchain.openContract(
        JettonWallet.createFromAddress(userJettonWalletAddress)
    );
    const balance = await userJettonWallet.getJettonBalance();
    expect(balance).toEqual(mint_value);

    // Deploy Asterizm Translator
    const translator = blockchain.openContract(
        await AsterizmTranslator.createFromConfig(
            deployer.address,
            40001,
            Cell.fromBase64(AsterizmTranslatorCode.code),
        )
    );

    const translatorDeployResult = await translator.sendConstructor(deployer.getSender(), toNano('2'));
    expect(translatorDeployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: translator.address,
        deploy: true,
        success: true,
    });

    // add sepolia chain to translator
    await translator.sendAddChain(deployer.getSender(), toNano('1'), 11155111, ChainTypes.EVM);
    // get chains
    const res = await translator.getChains();
    expect(res['1']).toBeUndefined();
    expect(res['40001']).not.toBeUndefined();
    expect(res['11155111']).not.toBeUndefined();

    // Deploy Asterizm Initializer
    const initializer = blockchain.openContract(
        await AsterizmInitializer.createFromConfig(
            {
                initializerTransferCode: asterizmInitializerTransferCode.code,
                clientTransferCode: asterizmClientTransferCode.code,
                translator: translator.address,
                owner: deployer.address,
            },
            Cell.fromBase64(AsterizmInitializerCode.code),
        )
    );

    const initializerDeployResult = await initializer.sendConstructor(deployer.getSender(), toNano('2'));
    expect(initializerDeployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: initializer.address,
        deploy: true,
        success: true,
    });

    // update initializer chains
    await initializer.sendUpdateChainsList(deployer.getSender(), toNano('2'));   
    const initializerCains = await initializer.getChains();
    expect(initializerCains['1']).toBeUndefined();
    expect(initializerCains['40001']).not.toBeUndefined();
    expect(initializerCains['11155111']).not.toBeUndefined();

    // update initializer local chain
    await initializer.sendUpdateLocalChainId(deployer.getSender(), toNano('2')); 
    const initializerCainId = await initializer.getLocalChainId();
    expect(initializerCainId).toEqual('40001');  

    // set initializer to translator
    await translator.sendSetInitializer(deployer.getSender(), toNano('2'), initializer.address);
    expect(await translator.getInitializerLib()).toEqual(initializer.address.toRawString());    // deploy multichain token
    const multichainToken = blockchain.openContract(
        await MultichainToken.createFromConfig(
            {
                owner: deployer.address,
                initializerLib: initializer.address,
                notifyTransferSendingResult: false,
                disableHashValidation: false,
                hashVersion: 1
            },
            Cell.fromBase64(MultichainTokenCode.code),
        )
    );

    const deployResult = await multichainToken.sendConstructor(deployer.getSender(), toNano('2'));
    expect(deployResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: multichainToken.address,
        deploy: true,
        success: true,
    });
    
    // initialize multichain token
    await multichainToken.sendInitialize(deployer.getSender(), toNano('5'));
    const multichainTokenCains = await multichainToken.getChains();
    expect(multichainTokenCains['1']).toBeUndefined();
    expect(multichainTokenCains['40001']).not.toBeUndefined();
    expect(multichainTokenCains['11155111']).not.toBeUndefined();
    const multichainTokenCainId = await multichainToken.getLocalChainId();
    expect(multichainTokenCainId).toEqual('40001'); 
    const multichainTokenInitializerTransferCode = await multichainToken.getInitializerTransferCode();
    expect(multichainTokenInitializerTransferCode).toEqual(asterizmInitializerTransferCode.code);
    const multichainTokenClientTransferCode = await multichainToken.getClientTransferCode();
    expect(multichainTokenClientTransferCode).toEqual(asterizmClientTransferCode.code);

    // now we need to set trusted address to multichain token
    const mockTrustedAddress = '0x'+deployer.getSender().address.hash.toString('hex'); 
    await multichainToken.sendAddTrustedAddress(
        deployer.getSender(), 
        toNano('1'), 
        {
            chainId: 11155111,
            trustedAddress: mockTrustedAddress,
        }
    );
    
    await multichainToken.sendAddTrustedAddress(
        deployer.getSender(), 
        toNano('1'), 
        {
            chainId: 40001,
            trustedAddress: mockTrustedAddress,
        }
    );
    const trustedAddresses = await multichainToken.getTrustedAddresses();
    expect(trustedAddresses['11155111']).toEqual(mockTrustedAddress);
    expect(trustedAddresses['40001']).toEqual(mockTrustedAddress);

    // get multichain token jetton wallet address
    const mtJettonWalletAddress = await minter.getWalletAddress(multichainToken.address);
    await multichainToken.sendSetBaseTokenWallet(deployer.getSender(), toNano('0.01'), {
        wallet: mtJettonWalletAddress,
    });
    expect(await multichainToken.getBaseTokenWallet()).toEqual(mtJettonWalletAddress.toRawString());
    // get multichain token jetton wallet
    const mtJettonWallet = blockchain.openContract(
        await JettonWallet.createFromAddress(
            mtJettonWalletAddress,
        )
    );
    expect(await mtJettonWallet.getJettonBalance()).toEqual(0n);

    return {
        deployer,
        user,
        userJettonWallet,
        minter,
        mint_value,
        translator,
        initializer,
        multichainToken,
        mtJettonWallet,
        mockTrustedAddress,
    }
}
