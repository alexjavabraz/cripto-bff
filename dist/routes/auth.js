"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const cognitoVerifier_1 = require("../services/cognitoVerifier");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'change-me-in-production';
const COOKIE_NAME = 'brln_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
// Role lookup by email — extend this map as users are added
const USER_ROLES = {
    'admin@brln.com': 'admin',
    'demo@brln.com': 'user',
};
// ---------------------------------------------------------------------------
// POST /auth/login  — validate Cognito ID token and issue session cookie
// ---------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
    try {
        const { idToken } = req.body;
        const correlationId = res.locals['correlationId'];
        if (!idToken) {
            res.status(400).json({ message: 'idToken é obrigatório.' });
            return;
        }
        let payload;
        try {
            payload = await cognitoVerifier_1.cognitoVerifier.verify(idToken);
        }
        catch (err) {
            logger_1.logger.warn({ correlationId, event: 'auth.login.token_invalid', err }, 'Invalid Cognito ID token');
            res.status(401).json({ message: 'Token inválido ou expirado.' });
            return;
        }
        const { sub, email } = payload;
        const role = USER_ROLES[email] ?? 'user';
        const sessionToken = jsonwebtoken_1.default.sign({ sub, email, role }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie(COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE,
        });
        logger_1.logger.info({ correlationId, userId: sub, email, role, event: 'auth.login.success' }, 'User logged in');
        res.json({ user: { id: sub, email, role } });
    }
    catch (err) {
        next(err);
    }
});
// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
    const correlationId = res.locals['correlationId'];
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            logger_1.logger.info({ correlationId, userId: payload.sub, event: 'auth.logout' }, 'User logged out');
        }
        catch { /* expired token — log anyway */ }
    }
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict' });
    res.json({ message: 'Sessão encerrada.' });
});
// ---------------------------------------------------------------------------
// GET /auth/me  — validate cookie and return current user
// ---------------------------------------------------------------------------
router.get('/me', (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
        res.status(401).json({ message: 'Não autenticado.' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const role = payload.role ?? 'user';
        res.json({ user: { id: payload.sub, email: payload.email, role } });
    }
    catch {
        res.clearCookie(COOKIE_NAME);
        res.status(401).json({ message: 'Sessão expirada.' });
    }
});
exports.default = router;
