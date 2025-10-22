import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import {ChainTypes} from '../constants/base_chain_types';
import { createInitialData } from '../utils/createInitialData';
import { decodeAccountData } from '../utils/decodeAccountData';

import asterizmTranslatorAbi from "../contracts/artifacts/AsterizmTranslator.abi.json"

export const Opcodes = {
    constructor: 0x68b55f3f,
    addChain: 0x5c057031,
    setInitializer: 0x413d126c,
    addRelayer: 0x48fc0650,
    transferMessage: 0x24747daa,
  };
/*
  {
  "addChain": "0x5c057031",
  "addChains": "0x7fc85c90",
  "addRelayer": "0x48fc0650",
  "chains": "0x473474c1",
  "constructor": "0x68b55f3f",
  "getChainsList": "0x4ae3b55b",
  "getLocalChainId": "0x472e9bd4",
  "logExternalMessage": "0x578fe4d0",
  "removeChainById": "0x179d4345",
  "removeRelayer": "0x78a04a22",
  "resendMessage": "0x1e35959c",
  "sendMessage": "0x1f94b8c6",
  "setInitializer": "0x413d126c",
  "transferMessage": "0x24747daa",
  "transferSendingResultNotification": "0x68718154",
  "updateTrustedRelayFee": "0x56e7063a"

  }
*/  

export class AsterizmTranslator implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AsterizmTranslator(address);
    }

     static async createFromConfig(owner: Address, localChainId: number, code: Cell, workchain = 0) {
        const dataStr = await createInitialData(asterizmTranslatorAbi, {
            owner_ : owner.toRawString(),
            localChainId_ : localChainId || 40001,
            localChainType_ : ChainTypes.TVM,
            nonce_ : 1,
        });
        const data = Cell.fromBase64(dataStr);
        const init = { code, data };
        return new AsterizmTranslator(contractAddress(workchain, init), init);
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

    public async sendAddChain(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        chainId: number,
        chainType: number
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.addChain, 32)
                .storeUint(chainId,64)
                .storeUint(chainType,8)
                .endCell(),
        });
    }

    public async sendSetInitializer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        initializer: Address,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.setInitializer, 32)
                .storeAddress(initializer)
                .endCell(),
        });
    }

    public async sendTransferMessage(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            _gasLimit: bigint, 
            _payload: string, 
        }) {
            const payload = Cell.fromBase64(params._payload);
            await provider.internal(via, {
                value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: beginCell()
                    .storeUint(Opcodes.transferMessage, 32)
                    .storeUint(params._gasLimit, 64)
                    .storeRef(payload)
                    .endCell(),
            });
        }

    public async getData(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmTranslatorAbi, provider);
        console.log(data);
    }
   
    public async getChains(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmTranslatorAbi, provider);
        return data.chains;
    }

    public async getInitializerLib(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmTranslatorAbi, provider);
        return data.initializerLib;
    }

    public async sendAddRelayer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            relayerAddress: Address,
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.addRelayer, 32)
                .storeAddress(params.relayerAddress)
                .endCell(),
        });
    }
}
