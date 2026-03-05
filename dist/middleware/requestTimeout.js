"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = requestTimeout;
const TIMEOUT_MS = Number(process.env['REQUEST_TIMEOUT_MS'] ?? 10_000);
/**
 * Times out requests that take longer than TIMEOUT_MS (default 10 s).
 * Returns 503 if the response has not been sent by then.
 */
function requestTimeout(req, res, next) {
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            res.status(503).json({
                message: 'O servidor demorou muito para responder. Tente novamente.',
                correlationId: res.locals['correlationId'] ?? null,
            });
        }
    }, TIMEOUT_MS);
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
}
