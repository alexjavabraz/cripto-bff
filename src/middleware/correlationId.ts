import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attaches a correlation ID to every request/response.
 * Re-uses `X-Correlation-Id` from the incoming request if present,
 * otherwise generates a fresh UUID.
 * The ID is stored in res.locals and echoed back as a response header.
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
  res.locals['correlationId'] = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}
