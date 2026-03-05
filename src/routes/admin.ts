import { Router, Response } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { balanceStore } from '../services/balance-store';
import { pendingTxStore } from '../services/pending-tx-store';
import { walletStore } from '../services/wallet-store';
import { executeBuy, executeSell } from './brln';
import { logger } from '../utils/logger';

const router = Router();

// All users known to the system (extend as needed)
const DEMO_USERS_LIST = [
  { id: 'usr_admin_001', email: 'admin@brln.com' },
  { id: 'usr_demo_001',  email: 'demo@brln.com'  },
  { id: 'usr_alice_001', email: 'alice@brln.com'  },
];

// ---------------------------------------------------------------------------
// GET /admin/users/balances
// ---------------------------------------------------------------------------
router.get('/users/balances', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = DEMO_USERS_LIST.map(u => {
    const bal = balanceStore.get(u.id);
    return { id: u.id, email: u.email, fiatBalance: bal.fiatBalance, brlnBalance: bal.brlnBalance };
  });

  const grandTotal = users.reduce(
    (acc, u) => ({ fiatTotal: acc.fiatTotal + u.fiatBalance, brlnTotal: acc.brlnTotal + u.brlnBalance }),
    { fiatTotal: 0, brlnTotal: 0 }
  );

  res.json({ users, grandTotal });
});

// ---------------------------------------------------------------------------
// GET /admin/users
// ---------------------------------------------------------------------------
router.get('/users', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = DEMO_USERS_LIST.map(u => ({
    id: u.id,
    email: u.email,
    walletAddress: walletStore.get(u.id),
  }));
  res.json({ users });
});

// ---------------------------------------------------------------------------
// POST /admin/transfer
// ---------------------------------------------------------------------------
router.post('/transfer', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { fromUserId, toUserId, amountFiat } = req.body as {
    fromUserId?: string;
    toUserId?: string;
    amountFiat?: number;
  };
  const correlationId = res.locals['correlationId'] as string | undefined;

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

  const fromBal = balanceStore.get(fromUserId);
  if (amount > fromBal.brlnBalance) {
    res.status(422).json({ message: 'Saldo BRLN insuficiente na conta de origem.' });
    return;
  }

  // Execute 1:1 BRLN transfer in balance store
  balanceStore.set(fromUserId, {
    fiatBalance: fromBal.fiatBalance,
    brlnBalance: parseFloat((fromBal.brlnBalance - amount).toFixed(2)),
  });
  const toBal = balanceStore.get(toUserId);
  balanceStore.set(toUserId, {
    fiatBalance: toBal.fiatBalance,
    brlnBalance: parseFloat((toBal.brlnBalance + amount).toFixed(2)),
  });

  const toAddress = walletStore.get(toUserId);
  const onChain = !!toAddress;
  const txId = `transfer_${Date.now()}`;

  logger.info({
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
    fromBalance: balanceStore.get(fromUserId),
    toBalance: balanceStore.get(toUserId),
    onChain,
  });
});

// ---------------------------------------------------------------------------
// GET /admin/transactions/pending
// ---------------------------------------------------------------------------
router.get('/transactions/pending', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const transactions = pendingTxStore
    .list()
    .filter(tx => tx.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ transactions });
});

// ---------------------------------------------------------------------------
// POST /admin/transactions/:txId/approve
// ---------------------------------------------------------------------------
router.post('/transactions/:txId/approve', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { txId } = req.params;
  const correlationId = res.locals['correlationId'] as string | undefined;
  const adminId = req.user!.id;

  const tx = pendingTxStore.get(txId);
  if (!tx) {
    res.status(404).json({ message: 'Transação não encontrada.' });
    return;
  }
  if (tx.status !== 'pending') {
    res.status(409).json({ message: 'Transação já processada.' });
    return;
  }

  // Execute the deferred buy or sell
  let updatedBalances: { fiatBalance: number; brlnBalance: number } | null = null;
  if (tx.type === 'buy') {
    updatedBalances = executeBuy(tx.userId, tx.amount);
  } else if (tx.type === 'sell') {
    updatedBalances = executeSell(tx.userId, tx.amount);
  }

  const updated = pendingTxStore.update(txId, {
    status: 'approved',
    resolvedAt: new Date().toISOString(),
    resolvedBy: adminId,
  });

  logger.info({ correlationId, event: 'admin.tx.approved', txId, adminId, amount: tx.amount }, 'Transaction approved');
  res.json({ transaction: updated, balances: updatedBalances });
});

// ---------------------------------------------------------------------------
// POST /admin/transactions/:txId/reject
// ---------------------------------------------------------------------------
router.post('/transactions/:txId/reject', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { txId } = req.params;
  const correlationId = res.locals['correlationId'] as string | undefined;
  const adminId = req.user!.id;

  const tx = pendingTxStore.get(txId);
  if (!tx) {
    res.status(404).json({ message: 'Transação não encontrada.' });
    return;
  }
  if (tx.status !== 'pending') {
    res.status(409).json({ message: 'Transação já processada.' });
    return;
  }

  const updated = pendingTxStore.update(txId, {
    status: 'rejected',
    resolvedAt: new Date().toISOString(),
    resolvedBy: adminId,
  });

  logger.info({ correlationId, event: 'admin.tx.rejected', txId, adminId }, 'Transaction rejected');
  res.json({ transaction: updated });
});

export default router;
