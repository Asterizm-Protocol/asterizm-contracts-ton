import { Address, Dictionary, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { createInitialData } from '../utils/createInitialData';
import { encodeMessageBody } from '../utils/encodeMessageBody';
import { decodeAccountData } from '../utils/decodeAccountData';

import multichainTokenAbi from "../contracts/artifacts/MultichainToken.abi.json"

export type MultichainTokenContractConfig = {
    owner: Address,
    initializerLib: Address,
    notifyTransferSendingResult: Boolean,
    disableHashValidation: Boolean,
    hashVersion: number
};

export const Opcodes = {
    constructor: 0x68b55f3f,
    initialize: 0x64b885d7,
    debugCrossChainTransfer: 0x59002fe7,
    addTrustedAddress: 0x6ba2e79b,
    debugTransfer: 0x7fa2f522,
    setJettonWallet: 0x1cbd1718,
    initAsterizmTransfer: 0x7d480ec3,
    addSender: 0x6d1f89ab,
    asterizmClReceive:  0x350f20a9,
    updateChainsList: 0x383933f2,
  };
/*
  {
    "debugCrossChainTransfer": "0x59002fe7",
  "debugTransfer": "0x7fa2f522",

   "addSender": "0x6d1f89ab",
  "addTrustedAddress": "0x6ba2e79b",
  "addTrustedAddresses": "0x2123c787",
  "asterizmClReceive": "0x350f20a9",
  "asterizmIzReceive": "0x74a69ba5",
  "constructor": "0x68b55f3f",
  "crossChainTransfer": "0x54dd3360",
  "getDisableHashValidation": "0x3d872dcb",
  "getExternalRelay": "0x2aa27769",
  "getInitializerAddress": "0x43de061d",
  "getNotifyTransferSendingResult": "0x3b416f10",
  "getTrustedAddresses": "0x0c002e5f",
  "initAsterizmTransfer": "0x7d480ec3",
  "initialize": "0x64b885d7",
  "jettonWallet": "0x30b4b26f",
  "lastTransfer": "0x71abe610",
  "onAsterizmReceiveCallback": "0x10d8da26",
  "onInitAsterizmTransferCallback": "0x26df9f2c",
  "onUpdateChainsListCallback": "0x0baff217",
  "onUpdateClientTransferCodeCallback": "0x302d7c75",
  "onUpdateInitializerTransferCodeCallback": "0x3bffcd7a",
  "onUpdateLocalChainIdCallback": "0x21bd2c09",
  "removeSender": "0x553e6d25",
  "removeTrustedSourceAddress": "0x1c30d75d",
  "resendAsterizmTransfer": "0x2168c733",
  "setExternalRelay": "0x5df6d154",
  "setJettonWallet": "0x1cbd1718",
  "tokenBalance": "0x433203b5",
  "transfer": "0x3664dbe1",
  "transferSendingResultNotification": "0x532b776e",
  "updateChainsList": "0x383933f2"

}
*/  

export class MultichainToken implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new MultichainToken(address);
    }

    static async createFromConfig(config: MultichainTokenContractConfig, code: Cell, workchain = 0) {
        const dataStr = await createInitialData(multichainTokenAbi, {
            owner_ : config.owner.toRawString(),
            initializerLib_ : config.initializerLib.toRawString(),
            notifyTransferSendingResult_ : config.notifyTransferSendingResult,
            disableHashValidation_ : config.disableHashValidation,
            hashVersion_: config.hashVersion,
        });
        const data = Cell.fromBase64(dataStr);
        const init = { code, data };
        return new MultichainToken(contractAddress(workchain, init), init);
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

    public async sendAddTrustedAddress(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            chainId: number,
            trustedAddress: string,
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.addTrustedAddress, 32)
                .storeUint(params.chainId, 64)
                .storeUint(BigInt(params.trustedAddress), 256)
                .endCell(),
        });
    }

    public async sendUpdateChainsList(
        provider: ContractProvider,
        via: Sender,
        value: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.updateChainsList, 32)
                .endCell(),
        });
    }

    public async sendDebugCrossChainTransfer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            dstChainId: number,
            from: Address,
            to: Address,
            amount: bigint,
        }
    ) {
        let bodyBase64 = await encodeMessageBody(multichainTokenAbi, 'debugCrossChainTransfer', {
            _dstChainId: params.dstChainId,
            _from: params.from.toRawString(),
            _to: params.to.toRawString(),
            amount: params.amount,
        });
        const body = Cell.fromBase64(bodyBase64);
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    public async sendDebugTransfer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            dst: Address,
            amount: bigint,
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.debugTransfer, 32)
                .storeAddress(params.dst)
                .storeUint(params.amount, 256)
                .endCell(),
        });
    }

    public async sendSetJettonWallet(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            wallet: Address,
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.setJettonWallet, 32)
                .storeAddress(params.wallet)
                .endCell(),
        });
    }

    public async sendAddSender(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            sender: Address,
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.addSender, 32)
                .storeAddress(params.sender)
                .endCell(),
        });
    }

    public async sendInitAsterizmTransfer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            dstChainId: bigint,
            txId: bigint,
            transferHash: bigint,
            transferFeeValue: bigint,
        }
    ) {
        
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.initAsterizmTransfer, 32)
                .storeUint(params.dstChainId, 64)
                .storeUint(params.txId, 256)
                .storeUint(params.transferHash, 256)
                .storeUint(params.transferFeeValue, 128)
                .endCell(),
        });
    }

    public async sendAsterizmClReceive(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        params: {
            srcChainId: bigint,
            srcAddress: bigint,
            txId: bigint,
            transferHash: bigint,
            payload: Cell,
        }
    ) {
        
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.asterizmClReceive, 32)
                .storeUint(params.srcChainId, 64)
                .storeUint(params.srcAddress, 256)
                .storeUint(params.txId, 256)
                .storeUint(params.transferHash, 256)
                .storeRef(params.payload)
                .endCell(),
        });
    }
    

    public async getData(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        console.log(data);
    }
    public async getChains(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.chains;
    }

    public async getLocalChainId(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.localChainId;
    }

    public async getInitializerTransferCode(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.initializerTransferCode;
    }

    public async getClientTransferCode(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.clientTransferCode;
    }

    public async getTrustedAddresses(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.trustedAddresses;
    }

    public async getTokenBalance(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.tokenBalance;
    }

    public async getJettonWallet(provider: ContractProvider) {
        const data = await decodeAccountData(multichainTokenAbi, provider);
        return data.jettonWallet;
    }
}
