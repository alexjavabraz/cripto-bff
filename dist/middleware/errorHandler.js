"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
function errorHandler(err, req, res, _next) {
    const status = err.statusCode ?? 500;
    const correlationId = res.locals['correlationId'];
    logger_1.logger.error({
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
