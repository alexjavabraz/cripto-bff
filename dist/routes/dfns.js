"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAdmin_1 = require("../middleware/requireAdmin");
const dfns_service_1 = require("../services/dfns.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// GET /dfns/wallet
// ---------------------------------------------------------------------------
router.get('/wallet', requireAdmin_1.requireAdmin, async (_req, res, next) => {
    try {
        const wallet = await dfns_service_1.dfnsService.getAdminWallet();
        const assets = await dfns_service_1.dfnsService.getWalletAssets(wallet.id).catch(() => []);
        res.json({ ...wallet, assets });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /dfns/transfers
// ---------------------------------------------------------------------------
router.post('/transfers', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { toAddress, amountBrln } = req.body;
        const correlationId = res.locals['correlationId'];
        if (!toAddress || amountBrln === undefined) {
            res.status(400).json({ message: 'toAddress e amountBrln são obrigatórios.' });
            return;
        }
        const amount = dfns_service_1.dfnsService.toTokenUnits(Number(amountBrln));
        const result = await dfns_service_1.dfnsService.transferERC20(dfns_service_1.dfnsService.adminWalletId, toAddress, dfns_service_1.dfnsService.contractAddress, amount);
        logger_1.logger.info({ correlationId, event: 'dfns.transfer', txId: result.id, toAddress, amount }, 'DFNS ERC-20 transfer');
        res.json({ txId: result.id, status: result.status });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /dfns/contract/deploy
// ---------------------------------------------------------------------------
router.post('/contract/deploy', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { name, symbol, decimals, initialAdmin } = req.body;
        const correlationId = res.locals['correlationId'];
        if (!name || !symbol || decimals === undefined || !initialAdmin) {
            res.status(400).json({ message: 'name, symbol, decimals e initialAdmin são obrigatórios.' });
            return;
        }
        const constructorArgs = dfns_service_1.dfnsService.encodeConstructorArgs(name, symbol, Number(decimals), initialAdmin);
        const deployData = dfns_service_1.dfnsService.contractBytecode + constructorArgs.slice(2);
        const result = await dfns_service_1.dfnsService.broadcastTransaction(dfns_service_1.dfnsService.adminWalletId, undefined, deployData);
        logger_1.logger.info({ correlationId, event: 'dfns.contract.deploy', txId: result.id }, 'Contract deployment broadcasted');
        res.json({ txId: result.id, status: result.status ?? 'Broadcasted', contractAddress: null });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// GET /dfns/contract/deploy/status/:txId
// ---------------------------------------------------------------------------
router.get('/contract/deploy/status/:txId', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { txId } = req.params;
        const result = await dfns_service_1.dfnsService.getTransactionStatus(dfns_service_1.dfnsService.adminWalletId, txId);
        const contractAddress = result.receipt?.contractAddress ?? null;
        res.json({ txId, status: result.status, contractAddress });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /dfns/contract/mint
// ---------------------------------------------------------------------------
router.post('/contract/mint', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { toAddress, amount } = req.body;
        const correlationId = res.locals['correlationId'];
        if (!toAddress || amount === undefined) {
            res.status(400).json({ message: 'toAddress e amount são obrigatórios.' });
            return;
        }
        const amountUnits = BigInt(Math.round(Number(amount) * 10 ** 2));
        const data = dfns_service_1.dfnsService.encodeContractCall('mint', [toAddress, amountUnits]);
        const result = await dfns_service_1.dfnsService.broadcastTransaction(dfns_service_1.dfnsService.adminWalletId, dfns_service_1.dfnsService.contractAddress, data);
        logger_1.logger.info({ correlationId, event: 'dfns.mint', txId: result.id, toAddress, amount }, 'Token mint');
        res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /dfns/contract/burn
// ---------------------------------------------------------------------------
router.post('/contract/burn', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { toAddress, amount } = req.body;
        const correlationId = res.locals['correlationId'];
        if (!toAddress || amount === undefined) {
            res.status(400).json({ message: 'toAddress e amount são obrigatórios.' });
            return;
        }
        const amountUnits = BigInt(Math.round(Number(amount) * 10 ** 2));
        const data = dfns_service_1.dfnsService.encodeContractCall('burn', [toAddress, amountUnits]);
        const result = await dfns_service_1.dfnsService.broadcastTransaction(dfns_service_1.dfnsService.adminWalletId, dfns_service_1.dfnsService.contractAddress, data);
        logger_1.logger.info({ correlationId, event: 'dfns.burn', txId: result.id, toAddress, amount }, 'Token burn');
        res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /dfns/contract/pause
// ---------------------------------------------------------------------------
router.post('/contract/pause', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const correlationId = res.locals['correlationId'];
        const data = dfns_service_1.dfnsService.encodeContractCall('pause', []);
        const result = await dfns_service_1.dfnsService.broadcastTransaction(dfns_service_1.dfnsService.adminWalletId, dfns_service_1.dfnsService.contractAddress, data);
        logger_1.logger.info({ correlationId, event: 'dfns.pause', txId: result.id }, 'Contract paused');
        res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /dfns/contract/unpause
// ---------------------------------------------------------------------------
router.post('/contract/unpause', requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const correlationId = res.locals['correlationId'];
        const data = dfns_service_1.dfnsService.encodeContractCall('unpause', []);
        const result = await dfns_service_1.dfnsService.broadcastTransaction(dfns_service_1.dfnsService.adminWalletId, dfns_service_1.dfnsService.contractAddress, data);
        logger_1.logger.info({ correlationId, event: 'dfns.unpause', txId: result.id }, 'Contract unpaused');
        res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
