"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'change-me-in-production';
const COOKIE_NAME = 'brln_session';
function authenticate(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
        res.status(401).json({ message: 'Não autenticado.' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { id: payload.sub, email: payload.email, role: payload.role ?? 'user' };
        next();
    }
    catch {
        res.clearCookie(COOKIE_NAME);
        res.status(401).json({ message: 'Sessão expirada.' });
    }
}
