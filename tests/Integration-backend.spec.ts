import { Blockchain } from '@ton/sandbox';
import { toNano, Address, beginCell, Cell } from '@ton/core';
import '@ton/test-utils';

import { decodeMessageBody } from '../utils/decodeMessageBody';
import clientTransferAbi from "../contracts/artifacts/AsterizmClientTransfer.abi.json"
import initializerAbi from "../contracts/artifacts/AsterizmInitializer.abi.json"
import translatorAbi from "../contracts/artifacts/AsterizmTranslator.abi.json"
import multichainTokenAbi from "../contracts/artifacts/MultichainToken.abi.json"
import { integrationDeploy } from './src/IntegrationDeploy';
import { ChainMock } from '../wrappers/ChainMock';
import ChainMockCode from '../contracts/artifacts/ChainMock.code.json';

describe('Integeration-backend', () => {
    it('Backend calls test', async () => {

        const blockchain = await Blockchain.create();
        
        const { 
            deployer, 
            user, 
            translator, 
            initializer, 
            userJettonWallet, 
            multichainToken, 
            mtJettonWallet,
            mockTrustedAddress
        } = await integrationDeploy(blockchain);

        // Deploy Chain Mock contract
        const chainMock = blockchain.openContract(
            await ChainMock.createFromConfig(
                deployer.address,
                Cell.fromBase64(ChainMockCode.code),
            )
        );
        
        const chainMockResult = await chainMock.sendConstructor(deployer.getSender(), toNano('2'));
        expect(chainMockResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: chainMock.address,
            deploy: true,
            success: true,
        });
        
        // transfer to multichain token JettonWallet
        // it leads to crossChainTransfer call
        const sendValue = toNano('5');
        const forwardPayload = beginCell()
            .storeUint(11155111, 64)
            .storeUint(BigInt("0x1234"),256)
            .endCell();
        const transfer_tx = await userJettonWallet.sendTransfer(
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

        // Get event InitiateTransferEvent         
        const slice = transfer_tx.externals[1].body.beginParse();
        const event_id =  slice.loadUint(32);
        expect(event_id).toEqual(0xc89167d);
        const chain_id =  slice.loadUint(64);
        const dstAddress = slice.loadBits(256);
        const txId = "0x" + slice.loadBits(256).toString();
        const transferHash = "0x" + slice.loadBits(256).toString();

        const init_tx = await multichainToken.sendInitAsterizmTransfer(deployer.getSender(), 
            toNano('0.3'), 
            {
            dstChainId: BigInt(chain_id),
            txId: BigInt(txId),
            transferHash: BigInt(transferHash),
            transferFeeValue: 0n,
        });
        expect(init_tx.externals.length).toEqual(3);

        let init_tx_event = await decodeMessageBody(translatorAbi, init_tx.externals[2].body.toBoc().toString('base64'));
        expect(init_tx_event.name).toEqual('SendMessageEvent');

        // get Transaction data
        const clSrcChainId = 11155111n;
        const clSrcAddress = BigInt(mockTrustedAddress);
        const clDstChainId = 40001n;
        const clDstAddress = BigInt(mockTrustedAddress);
        const clTxId = BigInt(0x15);

        await chainMock.sendBuildPayload(
            deployer.getSender(),
            toNano('0.5'),
            {
                dst: BigInt('0x'+user.address.hash.toString('hex')),
                value: 1n,
            }
        );
        const clPayload = Cell.fromBase64(await chainMock.getPayload());
        
        await chainMock.sendBuildTransferHash(
            deployer.getSender(),
            toNano('0.05'),
            {
            _srcChainId: clSrcChainId,
            _srcAddress: clSrcAddress,
            _dstChainId: clDstChainId,
            _dstAddress: clDstAddress,
            _txId: clTxId,
            _payload: clPayload,
        });
        const clTxHash = await chainMock.getHash();

        // call AsterizmInitializer.initTransfer
        const rcvDstAddress = '0x'+multichainToken.address.hash.toString('hex'); 
        const initTransfer = await initializer.sendInitTransfer(
            deployer.getSender(), 
            toNano('0.1'),
            {
                dstChainId: clDstChainId,
                dstAddress: BigInt(rcvDstAddress),
                transferHash: clTxHash,
                txId: clTxId,
                dstFeeAmount: 0n,
                relay: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000').toRawString(),
                transferResultNotifyFlag: false,
            }
        );
        expect(initTransfer.externals.length).toEqual(9);
        const eventPayloadReceived = await decodeMessageBody(multichainTokenAbi, initTransfer.externals[7].body.toBoc().toString('base64'));
        expect(eventPayloadReceived.name).toEqual('PayloadReceivedEvent');
        const transferHashContractDeployEvent = await decodeMessageBody(initializerAbi, initTransfer.externals[3].body.toBoc().toString('base64'));
        expect(transferHashContractDeployEvent.name).toEqual('TransferHashContractDeployEvent');
        
        // call AsterizmClReceive
        console.log((await blockchain.getContract(multichainToken.address)).balance);   
        let sendCl = await multichainToken.sendAsterizmClReceive(
            deployer.getSender(),
            toNano('0.12'),
            {
                srcChainId: clSrcChainId,
                srcAddress: clSrcAddress,
                txId: clTxId,
                transferHash: clTxHash,
                payload: clPayload,
            }
        );
        expect(sendCl.externals.length).toEqual(2);
        const successTransferExecutedEvent = await decodeMessageBody(multichainTokenAbi, sendCl.externals[0].body.toBoc().toString('base64'));
        expect(successTransferExecutedEvent.name).toEqual('SuccessTransferExecutedEvent');
        const executeTransferEvent = await decodeMessageBody(clientTransferAbi, sendCl.externals[1].body.toBoc().toString('base64'));
        expect(executeTransferEvent.name).toEqual('ExecuteTransferEvent');
        console.log((await blockchain.getContract(multichainToken.address)).balance);       
    });

//initAsterizmTransfer
//asterizmClReceive
//resendAsterizmTransfer
});
