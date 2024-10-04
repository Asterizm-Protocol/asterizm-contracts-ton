import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { TonClient } from '@eversdk/core';
import {libNode} from "@eversdk/lib-node";
import {ChainTypes} from '../constants/base_chain_types';
import { createInitialData } from '../utils/createInitialData';
import { decodeAccountData } from '../utils/decodeAccountData';
import { encodeMessageBody } from '../utils/encodeMessageBody';
// Application initialization
TonClient.useBinaryLibrary(libNode)

import asterizmInitializerAbi from "../contracts/artifacts/AsterizmInitializer.abi.json"

export const Opcodes = {
    constructor: 0x68b55f3f,
    updateChainsList: 0x383933f2,
    updateLocalChainId: 0x14146708,
  };
/*
  {
    "addBlockAddress": "0x271370ce",
  "blockAddresses": "0x5065f3bf",
  "constructor": "0x68b55f3f",
  "getChainsList": "0x4ae3b55b",
  "getClientTransferCode": "0x3fa6d995",
  "getInitializerTransferCode": "0x33c9c68c",
  "getLocalChainId": "0x472e9bd4",
  "getRelayData": "0x77e16e50",
  "initTransfer": "0x72734d90",
  "manageTrustedRelay": "0x150745d9",
  "onUpdateChainsListCallback": "0x0baff217",
  "onUpdateLocalChainIdCallback": "0x21bd2c09",
  "receivePayload": "0x572acc5c",
  "removeBlockAddress": "0x0c20e9de",
  "removeTrustedRelay": "0x394003ea",
  "resendTransfer": "0x5e8b6b08",
  "transferSendingResultNotification": "0x68718154",
  "updateChainsList": "0x383933f2",
  "updateLocalChainId": "0x14146708",
  "updateTrustedRelayFee": "0x56e7063a"
}

*/  

export class AsterizmInitializer implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AsterizmInitializer(address);
    }

     static async createFromConfig(
        callParam:{
            initializerTransferCode: string, 
            clientTransferCode: string, 
            translator: Address,
            owner: Address,
        }, code: Cell, workchain = 0) {
        const strData = await createInitialData(asterizmInitializerAbi, {
            owner_: callParam.owner.toRawString(),
            translatorLib_: callParam.translator.toRawString(),
            initializerTransferCode_: callParam.initializerTransferCode,
            clientTransferCode_: callParam.clientTransferCode,
        });
        const data = Cell.fromBase64(strData);
        const init = { code, data };
        return new AsterizmInitializer(contractAddress(workchain, init), init);
    }

    public async sendConstructor(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.constructor, 32)
                .endCell(),
        });
    }

    public async sendUpdateChainsList(provider: ContractProvider,
        via: Sender,
        value: bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.updateChainsList, 32)
                .endCell(),
        });
    }

    public async sendUpdateLocalChainId(provider: ContractProvider,
        via: Sender,
        value: bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.updateLocalChainId, 32)
                .endCell(),
        });
    }

    public async sendInitTransfer(provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            dstChainId: bigint,
            dstAddress: bigint,
            transferHash: bigint,
            txId: bigint,
            dstFeeAmount: bigint,
            relay: string,
            transferResultNotifyFlag: boolean,
        }
    ) {
        let bodyBase64 = await encodeMessageBody(asterizmInitializerAbi, 'initTransfer', {
            _dto: params,
            
        });
        const body = Cell.fromBase64(bodyBase64);
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    public async getData(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmInitializerAbi, provider);
        console.log(data);
    }
    public async getChains(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmInitializerAbi, provider);
        return data.chains;
    }

    public async getLocalChainId(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmInitializerAbi, provider);
        return data.localChainId;
    }
}
