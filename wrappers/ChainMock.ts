import { Address, Dictionary, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { createInitialData } from '../utils/createInitialData';
import { encodeMessageBody, encodeMessage } from '../utils/encodeMessageBody';
import { runTVM, makeAccountBoc } from '../utils/runTVM';
import { decodeAccountData } from '../utils/decodeAccountData';

import chainMockAbi from "../contracts/artifacts/ChainMock.abi.json"

export const Opcodes = {
    constructor: 0x68b55f3f,
    buildTransferHash: 0x61e82161,
    buildPayload: 0x070f5c5f,

  };

export class ChainMock implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static async createFromConfig(owner: Address, code: Cell, workchain = 0) {
        const dataStr = await createInitialData(chainMockAbi, {});
        const data = Cell.fromBase64(dataStr);
        const init = { code, data };
        return new ChainMock(contractAddress(workchain, init), init);
    }

    static createFromAddress(address: Address) {
        return new ChainMock(address);
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

    public async sendBuildTransferHash(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            _srcChainId: bigint, 
            _srcAddress: bigint, 
            _dstChainId: bigint, 
            _dstAddress: bigint, 
            _txId: bigint, 
            _payload: Cell,
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.buildTransferHash, 32)
                .storeUint(params._srcChainId, 64)
                .storeUint(params._srcAddress, 256)
                .storeUint(params._dstChainId, 64)
                .storeUint(params._dstAddress, 256)
                .storeUint(params._txId, 256)
                .storeRef(params._payload)
                .endCell(),
        });
    }

    public async sendBuildPayload(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            dst: bigint, 
            value: bigint, 
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.buildPayload, 32)
                .storeUint(params.dst, 256)
                .storeUint(params.value, 256)
                .endCell(),
        });
    }

    public async getDataEx(provider: ContractProvider, params: {
        _srcChainId: bigint, 
        _srcAddress: bigint, 
        _dstChainId: bigint, 
        _dstAddress: bigint, 
        _txId: bigint, 
        _payload: string,
    }) {
        /*const state = await provider.getState();
        if (state.state.type == "active") {
            const data = state.state.data!.toString('base64');
            const code = state.state.code!.toString('base64');
            const account = await makeAccountBoc(data, code);
            const message = await encodeMessage(chainMockAbi, account.id, 'buildTransferHash', params);
            await runTVM(message, account.boc, chainMockAbi);
        }*/
        const data = "te6ccgEBAgEAKAABAcABAEPQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAg";
        const code = "te6ccgECIAEABOIABCSK7VMg4wMgwP/jAiDA/uMC8gsdAgEfAqDtRNDXScMB+GYh2zzTAAGOFIMI1xgg+CjIzs7J+QBY+EL5EPKo3tM/AfhDIbnytCD4I4ED6KiCCBt3QKC58rT4Y9MfAfgjvPK50x8B2zzyPAcDA0rtRNDXScMB+GYi0NcLA6k4ANwhxwDjAiHXDR/yvCHjAwHbPPI8HBwDAiggghBotV8/u+MCIIIQaSUnzrrjAgUEAVAw0ds8+EshjhyNBHAAAAAAAAAAAAAAAAA6SUnzoMjOy//JcPsA3vIAGwRQIIIQQ+3cyLrjAiCCEE+W2VS64wIgghBh6CFhuuMCIIIQaLVfP7rjAhgXCAYCIjD4Qm7jAPhG8nPR+ADbPPIABxkBVu1E0NdJwgGOIHDtRND0BXAg+Gv4aoBA9A7yvdcL//hicPhjcfhqcPhr4w0bA5Aw+Eby4Ez4Qm7jACGV0z/U0dCS0z/i0//TP9P/0//U0ds8IY4cI9DTAfpAMDHIz4cgzoIQ4eghYc8Lgcv/yXD7AJEw4uMA8gAbCgkAKO1E0NP/0z8x+ENYyMv/yz/Oye1UATDQyM7JXkDIyz/L/8s/y//L/8zJ+ErbPDELAkBwcCLAAY6GI9s8bDF0jowiwAKOhiPbPGwxdODi3PLD5w4MAobQIPkCAdUxINdkiHCTUwK7joDoMNAg12Rwk1MBu44hItdKI9dJwgCeI/kCJ8jL/8v/ydD5AjfewgCUItUxM96k6F8FHw0E3CPXSiTXSSDCAI8PUzXIzslwI6sCcNs82zw03jAgwgGPQ3GTUwG5jzpTUNdI0CDXZHCTUwG7jyUi10oj10kgwgCPD1OEyM7JcCOrAnDbPNs8Od4wwgCUItUxM96k6F8DpLUB6DDewgCUI9UxNN6kEg8SDwPQ0CD5AgHVMSDXZIhwk1MCu48lI9dKJNdJIMIAjw9TNcjOyXAjqwJw2zzbPDTeMMIAlCPVMTTepOgw0CDXZHCTUwG7jiEi10oj10nCAJ4j+QInyMv/y//J0PkCN97CAJQi1TEz3qToXwUfEg8EPAHbPFjQXzLbPDMzlCBx10aOiNUxXzLbPDMz6DDbPBEQEBQBUiHPNab5IddLIJYjcCLXMTTeMCG7jo1c1xgzI84zXds8NMgz31MSzmwxFgEwbwAB0JUg10rDAI6J1QHIzlIg2zwy6MjOFgFCI4Qf+UEwMasCAZIgMt5TEr7y4EZREqEBXyKgvvLgRts8EwO6iCGSbDHhMAGAf6kMVQLQWJLVMeQBpwjXIW8AyJMjwwCOtl3XSasCIs81qwK2CLYIVHEwqgK1CdcYNs8WMiSiNCOOlCLXSZQi1TEz3yDPNcEIjoPbPMje3ujbPGwhHxYUASSWIW+IwACzjoYh2zwzzxHoyTEVABxvjW+NWSBviJJvjJEw4gA4URBviJ5vjSBviIQHoZRvjG8A35JvAOJYb4xvjAFQMNHbPPhKIY4cjQRwAAAAAAAAAAAAAAAAM+W2VSDIzssHyXD7AN7yABsDKDD4RvLgTPhCbuMA0wfR2zzbPPIAGxoZACz4S/hK+EP4QsjL/8s/z4PLB8v/ye1UAAT4agAu7UTQ0//TP9MAMdMH0//R+Gv4avhj+GIACvhG8uBMAhD0pCD0vfLATh8eABRzb2wgMC43MC4wAAA=";
        const account = await makeAccountBoc(data, code);
        const message = await encodeMessage(chainMockAbi, account.id, 'buildTransferHash', params);
        await runTVM(message, account.boc, chainMockAbi);
    }

    public async getMockTransferHash(
        _srcChainId: bigint, 
        _srcAddress: bigint, 
        _dstChainId: bigint, 
        _dstAddress: bigint, 
        _txId: bigint, 
        _payload: Cell
    ) {
        let bodyBase64 = await encodeMessageBody(chainMockAbi, 'buildTransferHash', {
            _srcChainId,
            _srcAddress,
            _dstChainId,
            _dstAddress,
            _txId,
            _payload
        });
    }

    public async getData(provider: ContractProvider) {
        const data = await decodeAccountData(chainMockAbi, provider);
        console.log(data);
    }

    public async getHash(provider: ContractProvider) {
        const data = await decodeAccountData(chainMockAbi, provider);
        return data.h;
    }

    public async getPayload(provider: ContractProvider) {
        const data = await decodeAccountData(chainMockAbi, provider);
        return data.payload;
    }
}
