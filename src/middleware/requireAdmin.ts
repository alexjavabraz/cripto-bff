import { Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from './authenticate';

/**
 * Middleware: verifies session cookie AND requires role === 'admin'.
 * Returns 401 if not authenticated, 403 if authenticated but not admin.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  authenticate(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
      return;
    }
    next();
  });
}
