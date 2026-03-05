"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletStore = void 0;
// In-memory wallet address store: userId → Ethereum address | null
const store = new Map([
    ['usr_admin_001', '0xAdm1n000000000000000000000000000000000001'],
    ['usr_demo_001', null],
    ['usr_alice_001', '0xA1ice00000000000000000000000000000000001'],
]);
exports.walletStore = {
    get(userId) {
        return store.has(userId) ? store.get(userId) ?? null : null;
    },
    set(userId, address) {
        store.set(userId, address);
    },
    entries() {
        return Array.from(store.entries()).map(([userId, walletAddress]) => ({ userId, walletAddress }));
    },
};
