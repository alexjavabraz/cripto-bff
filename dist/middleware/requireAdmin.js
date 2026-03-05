"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const authenticate_1 = require("./authenticate");
/**
 * Middleware: verifies session cookie AND requires role === 'admin'.
 * Returns 401 if not authenticated, 403 if authenticated but not admin.
 */
function requireAdmin(req, res, next) {
    (0, authenticate_1.authenticate)(req, res, () => {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
            return;
        }
        next();
    });
}
