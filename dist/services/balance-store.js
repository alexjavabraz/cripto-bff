"use strict";
// In-memory balance store — resets on server restart.
// TODO: replace with real DB queries to fiat system + BRLN on-chain data.
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceStore = void 0;
const DEFAULT_BALANCES = {
    usr_demo_001: { fiatBalance: 5000, brlnBalance: 5000 },
};
const store = new Map(Object.entries(DEFAULT_BALANCES));
exports.balanceStore = {
    get(userId) {
        if (!store.has(userId)) {
            store.set(userId, { fiatBalance: 1000, brlnBalance: 0 });
        }
        return { ...store.get(userId) };
    },
    set(userId, balance) {
        store.set(userId, { ...balance });
    },
};
