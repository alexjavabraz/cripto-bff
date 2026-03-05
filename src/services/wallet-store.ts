// In-memory wallet address store: userId → Ethereum address | null
const store = new Map<string, string | null>([
  ['usr_admin_001', '0xAdm1n000000000000000000000000000000000001'],
  ['usr_demo_001',  null],
  ['usr_alice_001', '0xA1ice00000000000000000000000000000000001'],
]);

export const walletStore = {
  get(userId: string): string | null {
    return store.has(userId) ? store.get(userId) ?? null : null;
  },

  set(userId: string, address: string | null): void {
    store.set(userId, address);
  },

  entries(): Array<{ userId: string; walletAddress: string | null }> {
    return Array.from(store.entries()).map(([userId, walletAddress]) => ({ userId, walletAddress }));
  },
};
