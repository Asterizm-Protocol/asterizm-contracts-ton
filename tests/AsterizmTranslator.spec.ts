import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { AsterizmTranslator } from '../wrappers/AsterizmTranslator';
import '@ton/test-utils';
import contractCode from '../contracts/artifacts/AsterizmTranslator.code.json';
import {ChainTypes} from '../constants/base_chain_types';

describe.skip('AsterizmTranslator', () => {
    let code: Cell;

    beforeAll(async () => {
        code =Cell.fromBase64(contractCode.code);
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tvmContract: SandboxContract<AsterizmTranslator>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        tvmContract = blockchain.openContract(
            await AsterizmTranslator.createFromConfig(
                deployer.address,
                40001,
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
        //console.log((await blockchain.getContract(tvmContract.address)).balance)
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and testContract are ready to use
    });

    it('add chains', async () => {
        // add sepolia
        await tvmContract.sendAddChain(deployer.getSender(), toNano('1'), 11155111, ChainTypes.EVM);
        // get chains
        const res = await tvmContract.getChains();
        expect(res['1']).toBeUndefined();
        expect(res['40000']).not.toBeUndefined();
        expect(res['11155111']).not.toBeUndefined();
    });

    it('add relayer', async () => {
        await tvmContract.sendAddRelayer(deployer.getSender(), toNano('0.1'),{ relayerAddress: Address.parse("0:0000000000000000000000000000000000000000000000000000000000000002")});
        await tvmContract.getData();
    });
});
