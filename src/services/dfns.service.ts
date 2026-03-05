import { Interface, AbiCoder } from 'ethers';
import StablecoinABI from '../contracts/StablecoinERC20.json';

const DFNS_API_URL     = process.env['DFNS_API_URL'] ?? 'https://api.dfns.ninja';
const DFNS_APP_ID      = process.env['DFNS_APP_ID'] ?? '';
const DFNS_TOKEN       = process.env['DFNS_SERVICE_ACCOUNT_TOKEN'] ?? '';
const ADMIN_WALLET_ID  = process.env['DFNS_ADMIN_WALLET_ID'] ?? '';
const CONTRACT_ADDRESS = process.env['DFNS_CONTRACT_ADDRESS'] ?? '';
const TOKEN_DECIMALS   = 2;

const iface = new Interface(StablecoinABI.abi);

function dfnsHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${DFNS_TOKEN}`,
    'X-DFNS-APPID': DFNS_APP_ID,
    'Content-Type': 'application/json',
  };
}

async function dfnsFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${DFNS_API_URL}${path}`;
  const res = await fetch(url, { ...options, headers: { ...dfnsHeaders(), ...(options.headers as any) } });
  const body = await res.json();
  if (!res.ok) {
    const err: any = new Error((body as any).message ?? 'DFNS API error');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export class DfnsService {
  async getAdminWallet(): Promise<any> {
    return dfnsFetch(`/wallets/${ADMIN_WALLET_ID}`);
  }

  async getWalletAssets(walletId: string): Promise<any> {
    return dfnsFetch(`/wallets/${walletId}/assets`);
  }

  async getTransactionStatus(walletId: string, txId: string): Promise<any> {
    return dfnsFetch(`/wallets/${walletId}/transactions/${txId}`);
  }

  async transferERC20(
    fromWalletId: string,
    toAddress: string,
    contractAddress: string,
    amount: string
  ): Promise<any> {
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

  async broadcastTransaction(
    walletId: string,
    to: string | undefined,
    data: string,
    value?: string
  ): Promise<any> {
    const body: Record<string, any> = { kind: 'Evm', data };
    if (to) body['to'] = to;
    if (value) body['value'] = value;
    return dfnsFetch(`/wallets/${walletId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  encodeContractCall(fn: string, args: any[]): string {
    return iface.encodeFunctionData(fn, args);
  }

  encodeConstructorArgs(name: string, symbol: string, decimals: number, initialAdmin: string): string {
    const abiCoder = new AbiCoder();
    return abiCoder.encode(
      ['string', 'string', 'uint8', 'address'],
      [name, symbol, decimals, initialAdmin]
    );
  }

  toTokenUnits(amount: number): string {
    return BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS)).toString();
  }

  get adminWalletId(): string { return ADMIN_WALLET_ID; }
  get contractAddress(): string { return CONTRACT_ADDRESS; }
  get contractBytecode(): string { return StablecoinABI.bytecode; }
}

export const dfnsService = new DfnsService();
