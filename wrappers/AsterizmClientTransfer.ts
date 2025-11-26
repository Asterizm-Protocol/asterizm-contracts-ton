import {Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode} from '@ton/core';

import asterizmClientTransferAbi from "../contracts/artifacts/AsterizmClientTransfer.abi.json"
import {decodeAccountData} from "../utils/decodeAccountData";

export const Opcodes = {
    constructor: 0x68b55f3f,
    initialize: 0x64b885d7,
    isExists: 0x24d79b33,
    isExecuted: 0x3841ec35,
};

export class AsterizmClientTransfer implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AsterizmClientTransfer(address);
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

    public async sendInitialize(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.initialize, 32)
                .endCell(),
        });
    }

    public async getData(provider: ContractProvider) {
        const data = await decodeAccountData(asterizmClientTransferAbi, provider);
        console.log(data);
    }
}
