import { Router, Response } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { dfnsService } from '../services/dfns.service';
import { logger } from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// GET /dfns/wallet
// ---------------------------------------------------------------------------
router.get('/wallet', requireAdmin, async (_req: AuthenticatedRequest, res: Response, next) => {
  try {
    const wallet = await dfnsService.getAdminWallet();
    const assets = await dfnsService.getWalletAssets(wallet.id).catch(() => []);
    res.json({ ...wallet, assets });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /dfns/transfers
// ---------------------------------------------------------------------------
router.post('/transfers', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { toAddress, amountBrln } = req.body as { toAddress?: string; amountBrln?: number };
    const correlationId = res.locals['correlationId'] as string | undefined;

    if (!toAddress || amountBrln === undefined) {
      res.status(400).json({ message: 'toAddress e amountBrln são obrigatórios.' });
      return;
    }

    const amount = dfnsService.toTokenUnits(Number(amountBrln));
    const result = await dfnsService.transferERC20(
      dfnsService.adminWalletId,
      toAddress,
      dfnsService.contractAddress,
      amount
    );

    logger.info({ correlationId, event: 'dfns.transfer', txId: result.id, toAddress, amount }, 'DFNS ERC-20 transfer');
    res.json({ txId: result.id, status: result.status });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /dfns/contract/deploy
// ---------------------------------------------------------------------------
router.post('/contract/deploy', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { name, symbol, decimals, initialAdmin } = req.body as {
      name?: string; symbol?: string; decimals?: number; initialAdmin?: string;
    };
    const correlationId = res.locals['correlationId'] as string | undefined;

    if (!name || !symbol || decimals === undefined || !initialAdmin) {
      res.status(400).json({ message: 'name, symbol, decimals e initialAdmin são obrigatórios.' });
      return;
    }

    const constructorArgs = dfnsService.encodeConstructorArgs(name, symbol, Number(decimals), initialAdmin);
    const deployData = dfnsService.contractBytecode + constructorArgs.slice(2);

    const result = await dfnsService.broadcastTransaction(dfnsService.adminWalletId, undefined, deployData);

    logger.info({ correlationId, event: 'dfns.contract.deploy', txId: result.id }, 'Contract deployment broadcasted');
    res.json({ txId: result.id, status: result.status ?? 'Broadcasted', contractAddress: null });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /dfns/contract/deploy/status/:txId
// ---------------------------------------------------------------------------
router.get('/contract/deploy/status/:txId', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { txId } = req.params;
    const result = await dfnsService.getTransactionStatus(dfnsService.adminWalletId, txId);
    const contractAddress = result.receipt?.contractAddress ?? null;
    res.json({ txId, status: result.status, contractAddress });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /dfns/contract/mint
// ---------------------------------------------------------------------------
router.post('/contract/mint', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { toAddress, amount } = req.body as { toAddress?: string; amount?: number };
    const correlationId = res.locals['correlationId'] as string | undefined;

    if (!toAddress || amount === undefined) {
      res.status(400).json({ message: 'toAddress e amount são obrigatórios.' });
      return;
    }

    const amountUnits = BigInt(Math.round(Number(amount) * 10 ** 2));
    const data = dfnsService.encodeContractCall('mint', [toAddress, amountUnits]);
    const result = await dfnsService.broadcastTransaction(dfnsService.adminWalletId, dfnsService.contractAddress, data);

    logger.info({ correlationId, event: 'dfns.mint', txId: result.id, toAddress, amount }, 'Token mint');
    res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /dfns/contract/burn
// ---------------------------------------------------------------------------
router.post('/contract/burn', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { toAddress, amount } = req.body as { toAddress?: string; amount?: number };
    const correlationId = res.locals['correlationId'] as string | undefined;

    if (!toAddress || amount === undefined) {
      res.status(400).json({ message: 'toAddress e amount são obrigatórios.' });
      return;
    }

    const amountUnits = BigInt(Math.round(Number(amount) * 10 ** 2));
    const data = dfnsService.encodeContractCall('burn', [toAddress, amountUnits]);
    const result = await dfnsService.broadcastTransaction(dfnsService.adminWalletId, dfnsService.contractAddress, data);

    logger.info({ correlationId, event: 'dfns.burn', txId: result.id, toAddress, amount }, 'Token burn');
    res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /dfns/contract/pause
// ---------------------------------------------------------------------------
router.post('/contract/pause', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const correlationId = res.locals['correlationId'] as string | undefined;
    const data = dfnsService.encodeContractCall('pause', []);
    const result = await dfnsService.broadcastTransaction(dfnsService.adminWalletId, dfnsService.contractAddress, data);
    logger.info({ correlationId, event: 'dfns.pause', txId: result.id }, 'Contract paused');
    res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /dfns/contract/unpause
// ---------------------------------------------------------------------------
router.post('/contract/unpause', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const correlationId = res.locals['correlationId'] as string | undefined;
    const data = dfnsService.encodeContractCall('unpause', []);
    const result = await dfnsService.broadcastTransaction(dfnsService.adminWalletId, dfnsService.contractAddress, data);
    logger.info({ correlationId, event: 'dfns.unpause', txId: result.id }, 'Contract unpaused');
    res.json({ txId: result.id, status: result.status ?? 'Broadcasted' });
  } catch (err) {
    next(err);
  }
});

export default router;
