import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type GranterConfig = {
    owner: Address;
    wallet: Address;
};

export const Opcodes = {
    set_address: 0x15eb8d35,
    grant: 0x30c3eaa8,
};

export const ZeroAddress = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000');

export function GranterConfigToCell(config: GranterConfig): Cell {
    return beginCell()
            .storeAddress(config.owner)
            .storeAddress(config.wallet)
        .endCell();
}

export class Granter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Granter(address);
    }

    static createFromConfig(config: GranterConfig, code: Cell, workchain = 0) {
        const data = GranterConfigToCell(config);
        const init = { code, data };
        return new Granter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetAddress(provider: ContractProvider, via: Sender, value: bigint, newAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.set_address, 32)
                .storeAddress(newAddress)
                .endCell(),
        });
    }

    async sendGrant(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.grant, 32)
                .endCell(),
        });
    }

    async getStateVariables(provider: ContractProvider): Promise<{ owner: Address; wallet: Address }>  {
        let state = await provider.getState();
        if (state.state.type !== 'active') {
            return {
                owner: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),
                wallet: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000')
            };
        }
        let res = await provider.get('get_state_variables', []);
        const owner = res.stack.readAddress();
        const wallet = res.stack.readAddress();
        return {
            owner,
            wallet
        };
    }

}
