import { Blockchain } from '@ton/sandbox';
import { toNano, Address, beginCell, Cell } from '@ton/core';
import '@ton/test-utils';
import { decodeMessageBody } from '../utils/decodeMessageBody';
import { findDecodedEvent } from '../utils/findDecodedEvent';
import clientTransferAbi from "../contracts/artifacts/AsterizmClientTransfer.abi.json"
import initializerTransferAbi from "../contracts/artifacts/AsterizmInitializerTransfer.abi.json"
import initializerAbi from "../contracts/artifacts/AsterizmInitializer.abi.json"
import translatorAbi from "../contracts/artifacts/AsterizmTranslator.abi.json"
import multichainTokenAbi from "../contracts/artifacts/MultichainToken.abi.json"
import asterizmRefundTransferAbi from "../contracts/artifacts/AsterizmRefundTransfer.abi.json"
import asterizmRefundRequestAbi from "../contracts/artifacts/AsterizmRefundRequest.abi.json"
import asterizmRefundConfirmationAbi from "../contracts/artifacts/AsterizmRefundConfirmation.abi.json"
import { integrationDeploy } from './src/IntegrationDeploy';
import { ChainMock } from '../wrappers/ChainMock';
import ChainMockCode from '../contracts/artifacts/ChainMock.code.json';

describe('Integration-backend', () => {
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
        const sendValue = toNano('6');
        const forwardPayload = beginCell()
            .storeUint(11155111, 64)
            .storeUint(BigInt("0x1234"),256)
            .endCell();
        const transfer_tx = await userJettonWallet.sendTransfer(
            user.getSender(),
            toNano('0.25'),
            sendValue,
            multichainToken.address,
            Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
            beginCell().endCell(), //customPayload: Cell,
            toNano('0.2'),//forward_ton_amount: bigint,
            forwardPayload
        )

        expect(BigInt(await mtJettonWallet.getJettonBalance()).toString()).toEqual(sendValue.toString());
        expect(BigInt(await userJettonWallet.getJettonBalance()).toString()).toEqual(sendValue.toString());
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual(sendValue.toString());

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
            }
        );
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
            }
        );
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
        //console.log((await blockchain.getContract(multichainToken.address)).balance);
        let sendCl = await multichainToken.sendAsterizmClReceive(
            deployer.getSender(),
            toNano('0.25'),
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

        //resendAsterizmTransfer
        const resend_tx = await multichainToken.sendResendAsterizmTransfer(deployer.getSender(),
            toNano('0.06'),
            {
                transferHash: BigInt(transferHash),
                transferFeeValue: 0n,
            }
        );
        expect(resend_tx.externals.length).toEqual(2);
        const resendAsterizmTransferEvent = await decodeMessageBody(multichainTokenAbi, resend_tx.externals[0].body.toBoc().toString('base64'));
        expect(resendAsterizmTransferEvent.name).toEqual('ResendAsterizmTransferEvent');
        const resendFailedTransferEvent = await decodeMessageBody(translatorAbi, resend_tx.externals[1].body.toBoc().toString('base64'));
        expect(resendFailedTransferEvent.name).toEqual('ResendFailedTransferEvent');

        // addRelayer
        await translator.sendAddRelayer(
            deployer.getSender(),
            toNano('0.06'),
            {relayerAddress: deployer.address}
        );

        //transferMessage  0.06
        await chainMock.sendBuildTrTransferMessageRequestDto(deployer.getSender(),
            toNano('0.1'),
            {
                srcChainId: clSrcChainId,
                srcAddress: clSrcAddress,
                dstChainId: clDstChainId,
                dstAddress: clDstAddress,
                txId: clTxId,
                b: false,
                transferHash: clTxHash,
            }
        );
        let payload = await chainMock.getPayload();
        const transferMessage = await translator.sendTransferMessage(
            deployer.getSender(),
            toNano('0.06'),
            {
                _gasLimit: 0n,
                _payload: payload,
            }
        );
    });


    it('Refund logic test', async () => {

        const blockchain = await Blockchain.create();

        let txEvent;

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

        await multichainToken.sendAddTrustedAddress(
            deployer.getSender(),
            toNano('1'),
            {
                chainId: 40001,
                trustedAddress: '0x' + multichainToken.address.hash.toString('hex'),
            }
        );
        const trustedAddresses = await multichainToken.getTrustedAddresses();
        expect(trustedAddresses['11155111']).toEqual(mockTrustedAddress);
        expect(trustedAddresses['40001']).toEqual('0x' + multichainToken.address.hash.toString('hex'));

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
        const sendValue = toNano('6');
        const forwardPayload = beginCell()
            .storeUint(40001, 64)
            .storeUint(BigInt("0x1234"),256)
            .endCell();
        const transfer_tx = await userJettonWallet.sendTransfer(
            user.getSender(),
            toNano('0.25'),
            sendValue,
            multichainToken.address,
            Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
            beginCell().endCell(), //customPayload: Cell,
            toNano('0.2'),//forward_ton_amount: bigint,
            forwardPayload
        )

        expect(transfer_tx.externals.length).toEqual(7);
        txEvent = await decodeMessageBody(multichainTokenAbi, transfer_tx.externals[0].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('TransferContractDeployEvent');
        txEvent = await decodeMessageBody(multichainTokenAbi, transfer_tx.externals[1].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('InitiateTransferEvent');
        // get Transaction data
        const clSrcChainId = BigInt(40001);
        const clSrcAddress = '0x'+multichainToken.address.hash.toString('hex');
        const clSrcAddressUint = BigInt(clSrcAddress);
        const clDstChainId = BigInt(txEvent.value._dstChainId);
        const clDstAddress = '0x'+multichainToken.address.hash.toString('hex');
        const clDstAddressUint = BigInt(clDstAddress);
        const clTransferHash = BigInt(txEvent.value._transferHash);
        const clTxId = BigInt(txEvent.value._txId);
        const clPayload = txEvent.value._payload;
        const clPayloadCell = Cell.fromBase64(clPayload);
        txEvent = await decodeMessageBody(multichainTokenAbi, transfer_tx.externals[2].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('RefundTransferContractDeployEvent');
        txEvent = await decodeMessageBody(multichainTokenAbi, transfer_tx.externals[3].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('AddRefundTransferEvent');
        txEvent = await decodeMessageBody(clientTransferAbi, transfer_tx.externals[4].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('DeployClientTransferContractEvent');
        txEvent = await decodeMessageBody(asterizmRefundTransferAbi, transfer_tx.externals[5].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('DeployRefundTransferContractEvent');
        txEvent = await decodeMessageBody(asterizmRefundTransferAbi, transfer_tx.externals[6].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('SetRefundDataEvent');
        expect(BigInt(await mtJettonWallet.getJettonBalance()).toString()).toEqual(sendValue.toString());
        expect(BigInt(await userJettonWallet.getJettonBalance()).toString()).toEqual(sendValue.toString());
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual(sendValue.toString());

        // call initAsterizmTransfer
        const init_tx = await multichainToken.sendInitAsterizmTransfer(
            deployer.getSender(),
            toNano('0.7'),
            {
                dstChainId: clDstChainId,
                txId: clTxId,
                transferHash: clTransferHash,
                transferFeeValue: 0n,
            }
        );
        expect(init_tx.externals.length).toEqual(10);
        // console.log([init_tx.externals[0].body.toBoc().toString('base64')]);
        txEvent = await findDecodedEvent(initializerAbi, init_tx.externals, 'InitTransferSuccessfullyEvent');
        expect(txEvent?.name).toEqual('InitTransferSuccessfullyEvent');
        txEvent = await findDecodedEvent(clientTransferAbi, init_tx.externals, 'ExecuteTransferEvent');
        expect(txEvent?.name).toEqual('ExecuteTransferEvent');
        txEvent = await findDecodedEvent(translatorAbi, init_tx.externals, 'SuccessTransferEvent');
        expect(txEvent?.name).toEqual('SuccessTransferEvent');
        txEvent = await findDecodedEvent(translatorAbi, init_tx.externals, 'TransferSendEvent');
        expect(txEvent?.name).toEqual('TransferSendEvent');
        txEvent = await findDecodedEvent(initializerAbi, init_tx.externals, 'TransferHashContractDeployEvent');
        expect(txEvent?.name).toEqual('TransferHashContractDeployEvent');
        txEvent = await findDecodedEvent(initializerAbi, init_tx.externals, 'SentPayloadEvent');
        expect(txEvent?.name).toEqual('SentPayloadEvent');
        txEvent = await findDecodedEvent(initializerTransferAbi, init_tx.externals, 'DeployInitializerTransferContractEvent');
        expect(txEvent?.name).toEqual('DeployInitializerTransferContractEvent');
        txEvent = await findDecodedEvent(multichainTokenAbi, init_tx.externals, 'TransferContractDeployEvent');
        expect(txEvent?.name).toEqual('TransferContractDeployEvent');
        txEvent = await findDecodedEvent(multichainTokenAbi, init_tx.externals, 'PayloadReceivedEvent');
        expect(txEvent?.name).toEqual('PayloadReceivedEvent');
        txEvent = await findDecodedEvent(clientTransferAbi, init_tx.externals, 'DeployClientTransferContractEvent');
        expect(txEvent?.name).toEqual('DeployClientTransferContractEvent');

        // call addRefundRequest
        let sendAddRefundRequestTx = await multichainToken.sendAddRefundRequest(
            user.getSender(),
            toNano('0.3'),
            { transferHash: clTransferHash }
        );
        expect(sendAddRefundRequestTx.externals.length).toEqual(4);
        txEvent = await decodeMessageBody(multichainTokenAbi, sendAddRefundRequestTx.externals[0].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('RefundRequestContractDeployEvent');
        txEvent = await decodeMessageBody(multichainTokenAbi, sendAddRefundRequestTx.externals[1].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('AddRefundRequestEvent');
        expect(BigInt(txEvent.value._transferHash)).toEqual(clTransferHash);
        expect(Address.parse(txEvent.value._userAddress).toRawString()).toEqual(user.address.toRawString());
        // expect(txEvent.value._amount).toEqual(sendValue.toString());
        expect(txEvent.value._tokenAddress).toEqual(await multichainToken.getBaseTokenWallet());
        txEvent = await decodeMessageBody(asterizmRefundRequestAbi, sendAddRefundRequestTx.externals[2].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('DeployRefundRequestContractEvent');
        txEvent = await decodeMessageBody(asterizmRefundRequestAbi, sendAddRefundRequestTx.externals[3].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('SetRefundDataEvent');

        // call confirmRefund
        let sendConfirmRefundTx = await multichainToken.sendConfirmRefund(
            deployer.getSender(),
            toNano('0.01'),
            { transferHash: clTransferHash }
        );
        expect(sendConfirmRefundTx.externals.length).toEqual(3);
        txEvent = await decodeMessageBody(multichainTokenAbi, sendConfirmRefundTx.externals[0].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('RefundConfirmationContractDeployEvent');
        txEvent = await decodeMessageBody(multichainTokenAbi, sendConfirmRefundTx.externals[1].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('ConfirmRefundEvent');
        expect(BigInt(txEvent.value._transferHash)).toEqual(clTransferHash);
        txEvent = await decodeMessageBody(asterizmRefundConfirmationAbi, sendConfirmRefundTx.externals[2].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('DeployRefundConfirmationContractEvent');

        // call processRefundRequest
        let sendProcessRefundRequestTx = await multichainToken.sendProcessRefundRequest(
            deployer.getSender(),
            toNano('0.5'),
            {
                transferHash: clTransferHash,
                status: true
            }
        );
        expect(sendProcessRefundRequestTx.externals.length).toEqual(2);
        txEvent = await decodeMessageBody(asterizmRefundRequestAbi, sendProcessRefundRequestTx.externals[0].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('ExecuteRefundRequestEvent');
        txEvent = await decodeMessageBody(multichainTokenAbi, sendProcessRefundRequestTx.externals[1].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('ProcessRefundRequestEvent');
        expect(BigInt(txEvent.value._transferHash)).toEqual(clTransferHash);
        expect(txEvent.value._status).toEqual(true);
        expect(Address.parse(txEvent.value._userAddress).toRawString()).toEqual(user.address.toRawString());
        // expect(txEvent.value._amount).toEqual(sendValue.toString());
        expect(txEvent.value._tokenAddress).toEqual(await multichainToken.getBaseTokenWallet());

        // call AsterizmClReceive
        let sendCl = await multichainToken.sendAsterizmClReceive(
            deployer.getSender(),
            toNano('0.3'),
            {
                srcChainId: clSrcChainId,
                srcAddress: clSrcAddressUint,
                txId: clTxId,
                transferHash: clTransferHash,
                payload: clPayloadCell,
            }
        );

        expect(sendCl.externals.length).toEqual(1);
        txEvent = await decodeMessageBody(multichainTokenAbi, sendCl.externals[0].body.toBoc().toString('base64'));
        expect(txEvent.name).toEqual('TransferWasRefundedEvent');
        expect(BigInt(txEvent.value._transferHash)).toEqual(clTransferHash);
    });
    it('Init transfer with init transfer fee failed', async () => {

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

        const initTransferFee = toNano('1');

        const init_tx = await multichainToken.sendSetInitTransferFee(deployer.getSender(), toNano('0.2'), {
            feeAmount: initTransferFee.toString(),
        });

        expect(await multichainToken.getInitTransferFee()).toEqual(initTransferFee.toString());

        // transfer to multichain token JettonWallet
        // it leads to crossChainTransfer call
        const sendValue = toNano('6');
        const zeroValue = '0';
        const forwardPayload = beginCell()
            .storeUint(11155111, 64)
            .storeUint(BigInt("0x1234"),256)
            .endCell();

        await userJettonWallet.sendTransfer(
            user.getSender(),
            toNano('0.25'),
            sendValue,
            multichainToken.address,
            Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
            beginCell().endCell(), //customPayload: Cell,
            toNano('0.2'),//forward_ton_amount: bigint,
            forwardPayload
        )
        // Transfer failed because of initTransferFee
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual(zeroValue.toString());
    });
    it('Init transfer with init transfer fee success', async () => {

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

        const initTransferFee = toNano('1');

        const init_tx = await multichainToken.sendSetInitTransferFee(deployer.getSender(), toNano('0.2'), {
            feeAmount: initTransferFee.toString(),
        });

        expect(await multichainToken.getInitTransferFee()).toEqual(initTransferFee.toString());

        // transfer to multichain token JettonWallet
        // it leads to crossChainTransfer call
        const sendValue = toNano('6');
        const zeroValue = '0';
        const forwardPayload = beginCell()
            .storeUint(11155111, 64)
            .storeUint(BigInt("0x1234"),256)
            .endCell();
        const transfer_tx = await userJettonWallet.sendTransfer(
            user.getSender(),
            toNano('1.25'), // with initTransferFee
            sendValue,
            multichainToken.address,
            Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),//responseAddress
            beginCell().endCell(), //customPayload: Cell,
            toNano('1.2'),//forward_ton_amount: bigint; with initTransferFee
            forwardPayload
        )
        expect(BigInt(await mtJettonWallet.getJettonBalance()).toString()).toEqual(sendValue.toString());
        expect(BigInt(await userJettonWallet.getJettonBalance()).toString()).toEqual(sendValue.toString());
        expect(BigInt(await multichainToken.getTokenBalance()).toString()).toEqual(sendValue.toString());

        // Get event InitiateTransferEvent
        const slice = transfer_tx.externals[1].body.beginParse();
        const event_id =  slice.loadUint(32);
        expect(event_id).toEqual(0xc89167d);
        const chain_id =  slice.loadUint(64);
        const dstAddress = slice.loadBits(256);
        const txId = "0x" + slice.loadBits(256).toString();
        const transferHash = "0x" + slice.loadBits(256).toString();
    });

});
