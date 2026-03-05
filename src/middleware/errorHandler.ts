import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500;
  const correlationId = res.locals['correlationId'] as string | undefined;

  logger.error({
    correlationId,
    method: req.method,
    url: req.url,
    status,
    err,
  }, err.message ?? 'Internal server error');

  res.status(status).json({
    message: status >= 500 ? 'Erro interno do servidor.' : err.message,
    correlationId,
  });
}
