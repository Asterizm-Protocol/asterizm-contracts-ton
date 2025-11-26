import type { NetworkProvider } from '@ton/blueprint';
import { toNano, Address, beginCell } from '@ton/core';
import { JettonWallet } from '../wrappers/jettons/JettonWallet';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import contractAddress from '../deployed/jettonMinter.json';
import mtContractAddress from '../deployed/multichain.json';
import coreContractAddress from '../deployed/core.json';
import { MultichainToken } from '../wrappers/MultichainToken';
import { sleep30 } from '../utils/sleep30';
import { TonClient } from '@ton/ton';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const sender = provider.sender();
    const owner = sender.address!;
    ui.write('!!!ATTENTION!!!');
    ui.write('!Use it only for transferring in out chain, just for tests!');
    ui.write('!!!ATTENTION!!!');
    ui.write('Owner address '+owner);

    const isInchainTransfer = await ui.input('Is in-one-chain transfer (1 - yes, 0 - no):');

    const jettonMinter = provider.open(
        JettonMinter.createFromAddress(
            Address.parse(contractAddress.jettonMinter)
        ),
    ) ;
    // get owner's jetton wallet
    const jettonWalletAddress = await jettonMinter.getWalletAddress(owner);
    ui.write("Owner's jetton wallet address " + jettonWalletAddress);

    // open jetton wallet
    const jettonWallet = provider.open(
        JettonWallet.createFromAddress(
            jettonWalletAddress
        ),
    );

    // For sendTransfer
    const chainId = await ui.input('Chain ID:');
    const amount = await ui.input('Jetton amount (without decimals):');
    const targetAddress = await ui.input('Target address (in uint):');

    // For initAsterizmTransfer
    const transferFeeValue = await ui.input('Transfer fee value (without decimals):');

    // For asterizmClReceive
    const srcChainId = await ui.input('Source chain id:');
    const srcAddress = await ui.input('Source address (in uint):');

    const forwardPayload = beginCell()
        .storeUint(parseInt(chainId), 64)
        .storeUint(BigInt(targetAddress),256)
        .endCell();

    // send jetton transfer to multichain token with payload
    await jettonWallet.sendTransfer(
        sender,
        toNano('0.08'),
        toNano(amount),
        Address.parse(mtContractAddress.multichainToken),
        owner,//responseAddress
        beginCell().endCell(), //customPayload: Cell,
        toNano('0.02'),//forward_ton_amount: bigint,
        forwardPayload
    )

    await sleep30(ui);
    await sleep30(ui);
    await sleep30(ui);

    // Get event InitiateTransferEvent
    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(mtContractAddress.multichainToken)
        ),
    );

    const api = provider.api() as TonClient;

    const txList = await api.getTransactions(multichainToken.address,{ limit: 2 });
    if (!txList) {
        ui.write('Transaction not found!');
        return;
    }
    const curTx = txList[0].outMessagesCount == 4 ? txList[0] : txList[1];
    if (curTx.outMessagesCount !== 4) {
        ui.write(`Wrong transaction format tx[0].outMessagesCount: ${curTx.outMessagesCount}`);
        return;
    }
    const slice = curTx.outMessages.get(3)!.body.beginParse();
    const eventId = slice.loadUint(32);

    if (eventId != 0xc89167d) {
        ui.write('Wrong cl event id ' + eventId.toString(16));
        return;
    }
    const chain_id =  slice.loadUint(64);
    const dstAddress = slice.loadBits(256);
    const txId = "0x" + slice.loadBits(256).toString();
    const transferHash = "0x" + slice.loadBits(256).toString();
    const payload = slice.loadRef();

    ui.write('Received event InitiateTransferEvent');
    ui.write('Chain id: ' + chain_id.toString());
    ui.write('Destination address: ' + dstAddress.toString());
    ui.write('Transaction id: ' + txId);
    ui.write('Transfer hash: ' + transferHash);
    ui.write('Payload: ' + payload.toBoc().toString('base64'));

    // Call initAsterizmTransfer
    await multichainToken.sendInitAsterizmTransfer(sender, toNano('0.4'), {
        dstChainId: BigInt(chain_id),
        txId: BigInt(txId),
        transferHash: BigInt(transferHash),
        transferFeeValue: BigInt(transferFeeValue),
    });

    await sleep30(ui);
    await sleep30(ui);

    if (!isInchainTransfer) {
        // Get event SendMessageEvent
        const translator = provider.open(
            MultichainToken.createFromAddress(
                Address.parse(coreContractAddress.translator)
            ),
        );

        const trTxList = await api.getTransactions(translator.address,{ limit: 2 });
        if (!trTxList) {
            ui.write('Transaction not found!');
            return;
        }

        const outCount = isInchainTransfer ? 4 : 2;
        let trTx = trTxList[0];
        if (trTx.outMessagesCount != outCount) {
            trTxList.forEach(function(value, index) {
                if (value.outMessagesCount == outCount) {
                    trTx = value;
                    return;
                }
            });
        }

        if (!trTx) {
            ui.write('Txs not found');
            return;
        }

        const outMessagesIndex = isInchainTransfer ? 1 : 0;
        const reSlice = trTx.outMessages.get(outMessagesIndex)!.body.beginParse();
        const trEvent_id =  reSlice.loadUint(32);
        // const eventId = isInchainTransfer ? 0x572acc5c : 0x2cf0f4ce;
        if (trEvent_id != 0x2cf0f4ce) {
            ui.write('Wrong tr event id ' + trEvent_id.toString(16));
            return;
        }
        const feeValue =  reSlice.loadUint(128);
        const rlPayload = reSlice.loadRef();
        ui.write('Received event SendMessageEvent');
        ui.write('feeValue: ' + feeValue);
        ui.write('payload: ' + rlPayload.toBoc().toString('base64'));
    }

    // Call asterizmClReceive
    await multichainToken.sendAsterizmClReceive(sender, toNano('0.2'),
    {
        srcChainId: BigInt(srcChainId),
        srcAddress: BigInt(srcAddress),
        txId: BigInt(txId),
        transferHash: BigInt(transferHash),
        payload: payload,
    });

    await sleep30(ui);
    await sleep30(ui);

    ui.write('Multichain token data:');
    await multichainToken.getData();

    ui.write('Done!');
}
