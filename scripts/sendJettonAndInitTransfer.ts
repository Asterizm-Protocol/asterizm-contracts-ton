import type { NetworkProvider } from '@ton/blueprint';
import { toNano, Address, beginCell } from '@ton/core';
import { JettonWallet } from '../wrappers/jettons/JettonWallet';
import { JettonMinter } from '../wrappers/jettons/JettonMinter';
import contractAddress from '../deployed/jettonMinter.json';
import mtContractAddress from '../deployed/multichain.json';
import coreContractAddress from '../deployed/core.json';
import { MultichainToken } from '../wrappers/MultichainToken';
import { sleep30 } from '../utils/sleep30';
import { TonClient4 } from '@ton/ton';

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

    const amout = await ui.input('Jetton amount (no decimals):'); 
    const to = Address.parse(mtContractAddress.multichainToken);
    const jetton_amount = BigInt(amout);
    const forwardPayload = beginCell()
        .storeUint(11155111, 64)
        .storeUint(BigInt("0x1234"),256)
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

    await sleep30(ui);
    await sleep30(ui);

    // Get event InitiateTransferEvent   
    const multichainToken = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(mtContractAddress.multichainToken)
        ),
    );
    const api = provider.api() as TonClient4;
    const b = await api.getLastBlock();
    const mtState = await api.getAccountLite(b.last.seqno,multichainToken.address);
    const tx = await api.getAccountTransactions(
        multichainToken.address, 
        BigInt(mtState.account.last!.lt), 
        Buffer.from(mtState.account.last!.hash,'base64')
    );
    if (tx.length < 1) {
        ui.write('No transaction found!')    
        return;
    }
    const curTx = tx[0].tx.outMessagesCount == 3 ? tx[0] : tx[1];
    if (curTx.tx.outMessagesCount != 3) {
        ui.write('Wrong transaction format tx[0]'+ tx[0].tx.outMessagesCount);
        ui.write('Wrong transaction format tx[1]'+ tx[1].tx.outMessagesCount);
        return;
    }
    const slice = curTx.tx.outMessages.get(2)!.body.beginParse();
    const event_id =  slice.loadUint(32);
    if (event_id != 0xc89167d) {
        ui.write('Wrong event id ' + event_id.toString(16));
        return;
    }
    const chain_id =  slice.loadUint(64);
    const dstAddress = slice.loadBits(256);
    const txId = "0x" + slice.loadBits(256).toString();
    const transferHash = "0x" + slice.loadBits(256).toString();

    ui.write('Received event InitiateTransferEvent');
    ui.write('Chain id ' + chain_id.toString());
    ui.write('Destination address ' + dstAddress.toString());
    ui.write('Transaction id ' + txId);
    ui.write('Transfer hash ' + transferHash);
    
    // Call initAsterizmTransfer
    const transferFeeValue = await ui.input('Transfer fee value (no decimals):'); 
    await multichainToken.sendInitAsterizmTransfer(sender, toNano('0.3'), {
        dstChainId: BigInt(chain_id),
        txId: BigInt(txId),
        transferHash: BigInt(transferHash),
        transferFeeValue: BigInt(transferFeeValue),
    });
    
    await sleep30(ui);
    await sleep30(ui);

    // Get event SendMessageEvent   
    const translator = provider.open(
        MultichainToken.createFromAddress(
            Address.parse(coreContractAddress.translator)
        ),
    );
    const bNew = await api.getLastBlock();
    const trState = await api.getAccountLite(bNew.last.seqno,translator.address);

    const trTx = await api.getAccountTransactions(
        translator.address, 
        BigInt(trState.account.last!.lt), 
        Buffer.from(trState.account.last!.hash,'base64')
    );
    if (trTx.length < 1) {
        ui.write('No transaction found!')    
        return;
    }
    if (trTx[0].tx.outMessagesCount != 2) {
        ui.write('Wrong transaction format '+ trTx[0].tx.outMessagesCount);
        return;
    }
    const reSlice = trTx[0].tx.outMessages.get(0)!.body.beginParse();
    const trEvent_id =  reSlice.loadUint(32);
    if (trEvent_id != 0x2cf0f4ce) {
        ui.write('Wrong event id ' + trEvent_id.toString(16));
        return;
    }
    const feeValue =  reSlice.loadUint(128);
    const payload = reSlice.loadRef();
    ui.write('Received event SendMessageEvent');
    ui.write('feeValue ' + feeValue);
    ui.write('payload ' + payload.toBoc().toString('base64'));

    ui.write('Done!');
}