"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAdmin_1 = require("../middleware/requireAdmin");
const balance_store_1 = require("../services/balance-store");
const pending_tx_store_1 = require("../services/pending-tx-store");
const wallet_store_1 = require("../services/wallet-store");
const brln_1 = require("./brln");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// All users known to the system (extend as needed)
const DEMO_USERS_LIST = [
    { id: 'usr_admin_001', email: 'admin@brln.com' },
    { id: 'usr_demo_001', email: 'demo@brln.com' },
    { id: 'usr_alice_001', email: 'alice@brln.com' },
];
// ---------------------------------------------------------------------------
// GET /admin/users/balances
// ---------------------------------------------------------------------------
router.get('/users/balances', requireAdmin_1.requireAdmin, (_req, res) => {
    const users = DEMO_USERS_LIST.map(u => {
        const bal = balance_store_1.balanceStore.get(u.id);
        return { id: u.id, email: u.email, fiatBalance: bal.fiatBalance, brlnBalance: bal.brlnBalance };
    });
    const grandTotal = users.reduce((acc, u) => ({ fiatTotal: acc.fiatTotal + u.fiatBalance, brlnTotal: acc.brlnTotal + u.brlnBalance }), { fiatTotal: 0, brlnTotal: 0 });
    res.json({ users, grandTotal });
});
// ---------------------------------------------------------------------------
// GET /admin/users
// ---------------------------------------------------------------------------
router.get('/users', requireAdmin_1.requireAdmin, (_req, res) => {
    const users = DEMO_USERS_LIST.map(u => ({
        id: u.id,
        email: u.email,
        walletAddress: wallet_store_1.walletStore.get(u.id),
    }));
    res.json({ users });
});
// ---------------------------------------------------------------------------
// POST /admin/transfer
// ---------------------------------------------------------------------------
router.post('/transfer', requireAdmin_1.requireAdmin, (req, res) => {
    const { fromUserId, toUserId, amountFiat } = req.body;
    const correlationId = res.locals['correlationId'];
    if (!fromUserId || !toUserId || amountFiat === undefined) {
        res.status(400).json({ message: 'fromUserId, toUserId e amountFiat são obrigatórios.' });
        return;
    }
    if (fromUserId === toUserId) {
        res.status(400).json({ message: 'Origem e destino não podem ser iguais.' });
        return;
    }
    const amount = Number(amountFiat);
    if (isNaN(amount) || amount <= 0) {
        res.status(400).json({ message: 'O valor deve ser maior que zero.' });
        return;
    }
    const fromBal = balance_store_1.balanceStore.get(fromUserId);
    if (amount > fromBal.brlnBalance) {
        res.status(422).json({ message: 'Saldo BRLN insuficiente na conta de origem.' });
        return;
    }
    // Execute 1:1 BRLN transfer in balance store
    balance_store_1.balanceStore.set(fromUserId, {
        fiatBalance: fromBal.fiatBalance,
        brlnBalance: parseFloat((fromBal.brlnBalance - amount).toFixed(2)),
    });
    const toBal = balance_store_1.balanceStore.get(toUserId);
    balance_store_1.balanceStore.set(toUserId, {
        fiatBalance: toBal.fiatBalance,
        brlnBalance: parseFloat((toBal.brlnBalance + amount).toFixed(2)),
    });
    const toAddress = wallet_store_1.walletStore.get(toUserId);
    const onChain = !!toAddress;
    const txId = `transfer_${Date.now()}`;
    logger_1.logger.info({
        correlationId,
        event: 'admin.transfer',
        fromUserId,
        toUserId,
        txId,
        amountBrln: amount,
        onChain,
    }, 'Admin stablecoin transfer');
    res.json({
        txId,
        amountBrln: amount,
        fromBalance: balance_store_1.balanceStore.get(fromUserId),
        toBalance: balance_store_1.balanceStore.get(toUserId),
        onChain,
    });
});
// ---------------------------------------------------------------------------
// GET /admin/transactions/pending
// ---------------------------------------------------------------------------
router.get('/transactions/pending', requireAdmin_1.requireAdmin, (_req, res) => {
    const transactions = pending_tx_store_1.pendingTxStore
        .list()
        .filter(tx => tx.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ transactions });
});
// ---------------------------------------------------------------------------
// POST /admin/transactions/:txId/approve
// ---------------------------------------------------------------------------
router.post('/transactions/:txId/approve', requireAdmin_1.requireAdmin, (req, res) => {
    const { txId } = req.params;
    const correlationId = res.locals['correlationId'];
    const adminId = req.user.id;
    const tx = pending_tx_store_1.pendingTxStore.get(txId);
    if (!tx) {
        res.status(404).json({ message: 'Transação não encontrada.' });
        return;
    }
    if (tx.status !== 'pending') {
        res.status(409).json({ message: 'Transação já processada.' });
        return;
    }
    // Execute the deferred buy or sell
    let updatedBalances = null;
    if (tx.type === 'buy') {
        updatedBalances = (0, brln_1.executeBuy)(tx.userId, tx.amount);
    }
    else if (tx.type === 'sell') {
        updatedBalances = (0, brln_1.executeSell)(tx.userId, tx.amount);
    }
    const updated = pending_tx_store_1.pendingTxStore.update(txId, {
        status: 'approved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: adminId,
    });
    logger_1.logger.info({ correlationId, event: 'admin.tx.approved', txId, adminId, amount: tx.amount }, 'Transaction approved');
    res.json({ transaction: updated, balances: updatedBalances });
});
// ---------------------------------------------------------------------------
// POST /admin/transactions/:txId/reject
// ---------------------------------------------------------------------------
router.post('/transactions/:txId/reject', requireAdmin_1.requireAdmin, (req, res) => {
    const { txId } = req.params;
    const correlationId = res.locals['correlationId'];
    const adminId = req.user.id;
    const tx = pending_tx_store_1.pendingTxStore.get(txId);
    if (!tx) {
        res.status(404).json({ message: 'Transação não encontrada.' });
        return;
    }
    if (tx.status !== 'pending') {
        res.status(409).json({ message: 'Transação já processada.' });
        return;
    }
    const updated = pending_tx_store_1.pendingTxStore.update(txId, {
        status: 'rejected',
        resolvedAt: new Date().toISOString(),
        resolvedBy: adminId,
    });
    logger_1.logger.info({ correlationId, event: 'admin.tx.rejected', txId, adminId }, 'Transaction rejected');
    res.json({ transaction: updated });
});
exports.default = router;
