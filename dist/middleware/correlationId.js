"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationId = correlationId;
const crypto_1 = require("crypto");
/**
 * Attaches a correlation ID to every request/response.
 * Re-uses `X-Correlation-Id` from the incoming request if present,
 * otherwise generates a fresh UUID.
 * The ID is stored in res.locals and echoed back as a response header.
 */
function correlationId(req, res, next) {
    const id = req.headers['x-correlation-id'] ?? (0, crypto_1.randomUUID)();
    res.locals['correlationId'] = id;
    res.setHeader('X-Correlation-Id', id);
    next();
}
