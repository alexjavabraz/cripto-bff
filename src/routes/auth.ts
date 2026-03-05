import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { cognitoVerifier } from '../services/cognitoVerifier';

const router = Router();

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'change-me-in-production';
const COOKIE_NAME = 'brln_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Role lookup by email — extend this map as users are added
const USER_ROLES: Record<string, 'admin' | 'user'> = {
  'admin@brln.com': 'admin',
  'demo@brln.com': 'user',
};

// ---------------------------------------------------------------------------
// POST /auth/login  — validate Cognito ID token and issue session cookie
// ---------------------------------------------------------------------------
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    const correlationId = res.locals['correlationId'] as string | undefined;

    if (!idToken) {
      res.status(400).json({ message: 'idToken é obrigatório.' });
      return;
    }

    let payload: { sub: string; email: string };
    try {
      payload = await cognitoVerifier.verify(idToken) as unknown as { sub: string; email: string };
    } catch (err) {
      logger.warn({ correlationId, event: 'auth.login.token_invalid', err }, 'Invalid Cognito ID token');
      res.status(401).json({ message: 'Token inválido ou expirado.' });
      return;
    }

    const { sub, email } = payload;
    const role: string = USER_ROLES[email] ?? 'user';
    const sessionToken = jwt.sign({ sub, email, role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    logger.info({ correlationId, userId: sub, email, role, event: 'auth.login.success' }, 'User logged in');
    res.json({ user: { id: sub, email, role } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req: Request, res: Response) => {
  const correlationId = res.locals['correlationId'] as string | undefined;
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
      logger.info({ correlationId, userId: payload.sub, event: 'auth.logout' }, 'User logged out');
    } catch { /* expired token — log anyway */ }
  }
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Sessão encerrada.' });
});

// ---------------------------------------------------------------------------
// GET /auth/me  — validate cookie and return current user
// ---------------------------------------------------------------------------
router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ message: 'Não autenticado.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role?: string };
    const role = payload.role ?? 'user';
    res.json({ user: { id: payload.sub, email: payload.email, role } });
  } catch {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ message: 'Sessão expirada.' });
  }
});

export default router;
