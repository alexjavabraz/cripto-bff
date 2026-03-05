"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./utils/logger");
const correlationId_1 = require("./middleware/correlationId");
const requestTimeout_1 = require("./middleware/requestTimeout");
const csrfGuard_1 = require("./middleware/csrfGuard");
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const brln_1 = __importDefault(require("./routes/brln"));
const admin_1 = __importDefault(require("./routes/admin"));
const dfns_1 = __importDefault(require("./routes/dfns"));
const errorHandler_1 = require("./middleware/errorHandler");
const connection_1 = require("./db/connection");
const app = (0, express_1.default)();
const PORT = Number(process.env['PORT'] ?? 3000);
// ── Rate limiters ─────────────────────────────────────────────────────────────
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60_000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas requisições. Tente novamente em breve.' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60_000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});
// ── Security & parsing ────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env['ALLOWED_ORIGIN']
        ? process.env['ALLOWED_ORIGIN'].split(',')
        : ['http://localhost:4200', 'http://localhost:4201'],
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '16kb' }));
// ── Observability ─────────────────────────────────────────────────────────────
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: (_req, res) => res.locals['correlationId'],
    customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.url} → ${res.statusCode}: ${err.message}`,
}));
app.use(correlationId_1.correlationId);
// ── Reliability ───────────────────────────────────────────────────────────────
app.use(requestTimeout_1.requestTimeout);
// ── CSRF guard (all mutation routes) ─────────────────────────────────────────
app.use(csrfGuard_1.csrfGuard);
// ── General rate limit ────────────────────────────────────────────────────────
app.use(generalLimiter);
// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, auth_1.default);
app.use('/user', user_1.default);
app.use('/brln', brln_1.default);
app.use('/admin', admin_1.default);
app.use('/dfns', dfns_1.default);
// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler_1.errorHandler);
// ── Database ───────────────────────────────────────────────────────────────────
(0, connection_1.connectDatabase)()
    .catch(err => logger_1.logger.error(err, 'MongoDB connection failed — continuing without DB'))
    .finally(() => {
    app.listen(PORT, () => {
        logger_1.logger.info({ port: PORT }, 'BFF running');
    });
});
exports.default = app;
