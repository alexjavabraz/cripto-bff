// In-memory balance store — resets on server restart.
// TODO: replace with real DB queries to fiat system + BRLN on-chain data.

export interface AccountBalance {
  fiatBalance: number;
  brlnBalance: number;
}

const DEFAULT_BALANCES: Record<string, AccountBalance> = {
  usr_demo_001: { fiatBalance: 5000, brlnBalance: 5000 },
};

const store = new Map<string, AccountBalance>(
  Object.entries(DEFAULT_BALANCES)
);

export const balanceStore = {
  get(userId: string): AccountBalance {
    if (!store.has(userId)) {
      store.set(userId, { fiatBalance: 1000, brlnBalance: 0 });
    }
    return { ...store.get(userId)! };
  },

  set(userId: string, balance: AccountBalance): void {
    store.set(userId, { ...balance });
  },
};
