import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { balanceStore, AccountBalance } from '../services/balance-store';
import { pendingTxStore } from '../services/pending-tx-store';
import { logger } from '../utils/logger';

const router = Router();

const LARGE_TX_THRESHOLD = Number(process.env['LARGE_TX_THRESHOLD'] ?? 10000);

// ---------------------------------------------------------------------------
// Shared execute helpers (exported for use by admin approval route)
// ---------------------------------------------------------------------------
export function executeBuy(userId: string, amount: number): AccountBalance {
  const current = balanceStore.get(userId);
  const updated: AccountBalance = {
    fiatBalance: parseFloat((current.fiatBalance - amount).toFixed(2)),
    brlnBalance: parseFloat((current.brlnBalance + amount).toFixed(2)),
  };
  balanceStore.set(userId, updated);
  return updated;
}

export function executeSell(userId: string, amount: number): AccountBalance {
  const current = balanceStore.get(userId);
  const updated: AccountBalance = {
    fiatBalance: parseFloat((current.fiatBalance + amount).toFixed(2)),
    brlnBalance: parseFloat((current.brlnBalance - amount).toFixed(2)),
  };
  balanceStore.set(userId, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// POST /brln/buy
// ---------------------------------------------------------------------------
router.post('/buy', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body as { amount?: number };

  if (amount === undefined || isNaN(Number(amount))) {
    res.status(400).json({ message: 'Informe um valor válido.' });
    return;
  }

  const parsedAmount = Number(amount);
  if (parsedAmount <= 0) {
    res.status(400).json({ message: 'O valor deve ser maior que zero.' });
    return;
  }

  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const current = balanceStore.get(userId);
  const correlationId = res.locals['correlationId'] as string | undefined;

  if (parsedAmount > current.fiatBalance) {
    res.status(422).json({ message: 'Saldo fiat insuficiente.' });
    return;
  }

  // Large transactions go to pending queue for admin approval
  if (parsedAmount > LARGE_TX_THRESHOLD) {
    const txId = `buy_${Date.now()}_${userId.slice(-4)}`;
    pendingTxStore.add({
      txId,
      type: 'buy',
      userId,
      userEmail,
      amount: parsedAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    logger.info({ correlationId, event: 'brln.buy.pending', userId, txId, amount: parsedAmount },
      'Large buy transaction queued for approval');
    res.status(202).json({
      status: 'pending',
      txId,
      message: 'Transação aguardando aprovação do administrador.',
    });
    return;
  }

  const updated = executeBuy(userId, parsedAmount);
  const txId = `buy_${Date.now()}_${userId.slice(-4)}`;

  logger.info({
    correlationId, event: 'brln.buy', userId, txId, amount: parsedAmount,
    fiatBalance: updated.fiatBalance, brlnBalance: updated.brlnBalance,
  }, 'BRLN buy transaction completed');

  res.json({ txId, amount: parsedAmount, fiatBalance: updated.fiatBalance, brlnBalance: updated.brlnBalance });
});

// ---------------------------------------------------------------------------
// POST /brln/sell
// ---------------------------------------------------------------------------
router.post('/sell', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body as { amount?: number };

  if (amount === undefined || isNaN(Number(amount))) {
    res.status(400).json({ message: 'Informe um valor válido.' });
    return;
  }

  const parsedAmount = Number(amount);
  if (parsedAmount <= 0) {
    res.status(400).json({ message: 'O valor deve ser maior que zero.' });
    return;
  }

  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const current = balanceStore.get(userId);
  const correlationId = res.locals['correlationId'] as string | undefined;

  if (parsedAmount > current.brlnBalance) {
    res.status(422).json({ message: 'Saldo BRLN insuficiente.' });
    return;
  }

  // Large transactions go to pending queue for admin approval
  if (parsedAmount > LARGE_TX_THRESHOLD) {
    const txId = `sell_${Date.now()}_${userId.slice(-4)}`;
    pendingTxStore.add({
      txId,
      type: 'sell',
      userId,
      userEmail,
      amount: parsedAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    logger.info({ correlationId, event: 'brln.sell.pending', userId, txId, amount: parsedAmount },
      'Large sell transaction queued for approval');
    res.status(202).json({
      status: 'pending',
      txId,
      message: 'Transação aguardando aprovação do administrador.',
    });
    return;
  }

  const updated = executeSell(userId, parsedAmount);
  const txId = `sell_${Date.now()}_${userId.slice(-4)}`;

  logger.info({
    correlationId, event: 'brln.sell', userId, txId, amount: parsedAmount,
    fiatBalance: updated.fiatBalance, brlnBalance: updated.brlnBalance,
  }, 'BRLN sell transaction completed');

  res.json({ txId, amount: parsedAmount, fiatBalance: updated.fiatBalance, brlnBalance: updated.brlnBalance });
});

export default router;
