"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dfnsService = exports.DfnsService = void 0;
const ethers_1 = require("ethers");
const StablecoinERC20_json_1 = __importDefault(require("../contracts/StablecoinERC20.json"));
const DFNS_API_URL = process.env['DFNS_API_URL'] ?? 'https://api.dfns.ninja';
const DFNS_APP_ID = process.env['DFNS_APP_ID'] ?? '';
const DFNS_TOKEN = process.env['DFNS_SERVICE_ACCOUNT_TOKEN'] ?? '';
const ADMIN_WALLET_ID = process.env['DFNS_ADMIN_WALLET_ID'] ?? '';
const CONTRACT_ADDRESS = process.env['DFNS_CONTRACT_ADDRESS'] ?? '';
const TOKEN_DECIMALS = 2;
const iface = new ethers_1.Interface(StablecoinERC20_json_1.default.abi);
function dfnsHeaders() {
    return {
        'Authorization': `Bearer ${DFNS_TOKEN}`,
        'X-DFNS-APPID': DFNS_APP_ID,
        'Content-Type': 'application/json',
    };
}
async function dfnsFetch(path, options = {}) {
    const url = `${DFNS_API_URL}${path}`;
    const res = await fetch(url, { ...options, headers: { ...dfnsHeaders(), ...options.headers } });
    const body = await res.json();
    if (!res.ok) {
        const err = new Error(body.message ?? 'DFNS API error');
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}
class DfnsService {
    async getAdminWallet() {
        return dfnsFetch(`/wallets/${ADMIN_WALLET_ID}`);
    }
    async getWalletAssets(walletId) {
        return dfnsFetch(`/wallets/${walletId}/assets`);
    }
    async getTransactionStatus(walletId, txId) {
        return dfnsFetch(`/wallets/${walletId}/transactions/${txId}`);
    }
    async transferERC20(fromWalletId, toAddress, contractAddress, amount) {
        return dfnsFetch(`/wallets/${fromWalletId}/transfers`, {
            method: 'POST',
            body: JSON.stringify({
                kind: 'Erc20',
                to: toAddress,
                contract: contractAddress,
                amount,
            }),
        });
    }
    async broadcastTransaction(walletId, to, data, value) {
        const body = { kind: 'Evm', data };
        if (to)
            body['to'] = to;
        if (value)
            body['value'] = value;
        return dfnsFetch(`/wallets/${walletId}/transactions`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    encodeContractCall(fn, args) {
        return iface.encodeFunctionData(fn, args);
    }
    encodeConstructorArgs(name, symbol, decimals, initialAdmin) {
        const abiCoder = new ethers_1.AbiCoder();
        return abiCoder.encode(['string', 'string', 'uint8', 'address'], [name, symbol, decimals, initialAdmin]);
    }
    toTokenUnits(amount) {
        return BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS)).toString();
    }
    get adminWalletId() { return ADMIN_WALLET_ID; }
    get contractAddress() { return CONTRACT_ADDRESS; }
    get contractBytecode() { return StablecoinERC20_json_1.default.bytecode; }
}
exports.DfnsService = DfnsService;
exports.dfnsService = new DfnsService();
