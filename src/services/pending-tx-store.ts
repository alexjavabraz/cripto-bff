export interface PendingTx {
  txId: string;
  type: 'buy' | 'sell' | 'transfer';
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

const store = new Map<string, PendingTx>();

export const pendingTxStore = {
  add(tx: PendingTx): void {
    store.set(tx.txId, { ...tx });
  },

  get(txId: string): PendingTx | undefined {
    const tx = store.get(txId);
    return tx ? { ...tx } : undefined;
  },

  list(): PendingTx[] {
    return Array.from(store.values()).map(tx => ({ ...tx }));
  },

  update(txId: string, patch: Partial<PendingTx>): PendingTx | undefined {
    const tx = store.get(txId);
    if (!tx) return undefined;
    const updated = { ...tx, ...patch };
    store.set(txId, updated);
    return { ...updated };
  },
};
