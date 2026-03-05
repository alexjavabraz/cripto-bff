import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { balanceStore } from '../services/balance-store';

const router = Router();

// GET /user/balance
router.get('/balance', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const balance = balanceStore.get(req.user!.id);
  res.json(balance);
});

export default router;
