import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'change-me-in-production';
const COOKIE_NAME = 'brln_session';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;

  if (!token) {
    res.status(401).json({ message: 'Não autenticado.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role?: string };
    req.user = { id: payload.sub, email: payload.email, role: payload.role ?? 'user' };
    next();
  } catch {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ message: 'Sessão expirada.' });
  }
}
