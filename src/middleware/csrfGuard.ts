import { Request, Response, NextFunction } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defense-in-depth: requires `X-Requested-With: XMLHttpRequest` on all
 * state-changing requests. Works alongside SameSite=strict cookies.
 * Custom headers cannot be set by cross-origin form submissions or
 * simple CORS requests without a preflight that the CORS policy would reject.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    res.status(403).json({ message: 'Requisição inválida.' });
    return;
  }

  next();
}
