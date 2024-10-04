import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';


export type TvmContractConfig = {
    s: number;
};

export function tvmContractConfigToCell(config: TvmContractConfig): Cell {
    return beginCell()
        .storeUint(0, 256) // _pubkey
        .storeUint(0, 64)  // _timestamp
        .storeUint(0n, 1)   // _constructorFlag
        .storeUint(config.s, 32) // s
        .endCell();
}

export const Opcodes = {
    constructor: 0x224daccc,
    getValue: 0x5a021e30,
    setValue: 0x56334d0d
};

export type SetValueEvent = {
    kind: 'SetValueEvent';
    value: number;
    _feeAmount: bigint;
};

export class TvmContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TvmContract(address);
    }

    static createFromConfig(config: TvmContractConfig, code: Cell, workchain = 0) {
        const data = tvmContractConfigToCell(config);
        const init = { code, data };
        return new TvmContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    public async sendConstructor(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        s: number,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.constructor, 32)
                .storeUint(s, 32)
                .endCell(),
        });
    }

    async sendValue(
        provider: ContractProvider,
        via: Sender,
        opts: {
            s: number;
            value: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.setValue, 32)
                .storeUint(opts.s, 32)
                .endCell(),
        });
    }

    async getStorageValue(provider: ContractProvider) {
        //const result = await provider.get('getValue', []);
        //result.stack.readNumber();
        const result = await provider.getState();
        result.state;
        if (result.state.type === "active") {
            const data = result.state.data;
            const cell = Cell.fromBoc(data!)[0];
            const p = cell.beginParse();
            p.skip(321);
            return p.loadUint(32);
        }
        return -1;
    }
}
