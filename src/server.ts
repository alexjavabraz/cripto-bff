import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { logger } from './utils/logger';
import { correlationId } from './middleware/correlationId';
import { requestTimeout } from './middleware/requestTimeout';
import { csrfGuard } from './middleware/csrfGuard';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import brlnRoutes from './routes/brln';
import adminRoutes from './routes/admin';
import dfnsRoutes from './routes/dfns';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './db/connection';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3000);

// ── Rate limiters ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60_000,       // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em breve.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env['ALLOWED_ORIGIN']
    ? process.env['ALLOWED_ORIGIN'].split(',')
    : ['http://localhost:4200', 'http://localhost:4201'],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '16kb' }));

// ── Observability ─────────────────────────────────────────────────────────────
app.use(pinoHttp({
  logger,
  genReqId: (_req, res) => res.locals['correlationId'] as string,
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode}: ${err.message}`,
}));
app.use(correlationId);

// ── Reliability ───────────────────────────────────────────────────────────────
app.use(requestTimeout);

// ── CSRF guard (all mutation routes) ─────────────────────────────────────────
app.use(csrfGuard);

// ── General rate limit ────────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/user', userRoutes);
app.use('/brln', brlnRoutes);
app.use('/admin', adminRoutes);
app.use('/dfns', dfnsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Database ───────────────────────────────────────────────────────────────────
connectDatabase()
  .catch(err => logger.error(err, 'MongoDB connection failed — continuing without DB'))
  .finally(() => {
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'BFF running');
    });
  });

export default app;
