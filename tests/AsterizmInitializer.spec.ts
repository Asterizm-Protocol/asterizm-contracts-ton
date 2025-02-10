import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { AsterizmInitializer } from '../wrappers/AsterizmInitializer';
import '@ton/test-utils';
import contractCode from '../contracts/artifacts/AsterizmInitializer.code.json';
import asterizmClientTransferCode from '../contracts/artifacts/AsterizmClientTransfer.code.json';
import asterizmInitializerTransferCode from '../contracts/artifacts/AsterizmInitializerTransfer.code.json';


describe('AsterizmInitializer', () => {
    let code: Cell;

    beforeAll(async () => {
        code =Cell.fromBase64(contractCode.code);
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tvmContract: SandboxContract<AsterizmInitializer>;

    it('should not deploy', async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        const ZeroAddress = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000');

        tvmContract = blockchain.openContract(
            await AsterizmInitializer.createFromConfig(
                {
                    initializerTransferCode: asterizmInitializerTransferCode.code,
                    clientTransferCode: asterizmClientTransferCode.code,
                    translator: deployer.address,
                    owner: ZeroAddress,
                },
                code,
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await tvmContract.sendConstructor(deployer.getSender(), toNano('5'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tvmContract.address,
            exitCode: 5002,
            success: false,
        });
    });
    it('should deploy', async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        tvmContract = blockchain.openContract(
            await AsterizmInitializer.createFromConfig(
                {
                    initializerTransferCode: asterizmInitializerTransferCode.code,
                    clientTransferCode: asterizmClientTransferCode.code,
                    translator: deployer.address,
                    owner: deployer.address,
                },
                code,
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await tvmContract.sendConstructor(deployer.getSender(), toNano('5'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tvmContract.address,
            deploy: true,
            success: true,
        });
    });
});
