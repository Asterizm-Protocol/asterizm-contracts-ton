import { Blockchain } from '@ton/sandbox';
import { toNano } from '@ton/core';
import '@ton/test-utils';
import { integrationDeploy } from './src/IntegrationDeploy';

describe.skip('Integeration', () => {
    it('Integeration deploy', async () => {
        const blockchain = await Blockchain.create();

        await integrationDeploy(blockchain);
        
        // debug is not available now
        // test crossChainTransfer call
        /*const sendValue = 200n;
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual('0');
        const result = await multichainToken.sendDebugCrossChainTransfer(deployer.getSender(), toNano('0.02'), {
            dstChainId: 11155111,
            from: translator.address,
            to: deployer.address, // any mock address
            amount: sendValue,
        });
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual(sendValue.toString());

        console.log(result);*/
    });
});
