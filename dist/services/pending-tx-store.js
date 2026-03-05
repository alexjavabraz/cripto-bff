"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingTxStore = void 0;
const store = new Map();
exports.pendingTxStore = {
    add(tx) {
        store.set(tx.txId, { ...tx });
    },
    get(txId) {
        const tx = store.get(txId);
        return tx ? { ...tx } : undefined;
    },
    list() {
        return Array.from(store.values()).map(tx => ({ ...tx }));
    },
    update(txId, patch) {
        const tx = store.get(txId);
        if (!tx)
            return undefined;
        const updated = { ...tx, ...patch };
        store.set(txId, updated);
        return { ...updated };
    },
};
