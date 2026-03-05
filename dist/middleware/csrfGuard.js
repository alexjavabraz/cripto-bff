"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfGuard = csrfGuard;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/**
 * CSRF defense-in-depth: requires `X-Requested-With: XMLHttpRequest` on all
 * state-changing requests. Works alongside SameSite=strict cookies.
 * Custom headers cannot be set by cross-origin form submissions or
 * simple CORS requests without a preflight that the CORS policy would reject.
 */
function csrfGuard(req, res, next) {
    if (!MUTATION_METHODS.has(req.method)) {
        next();
        return;
    }
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        res.status(403).json({ message: 'Requisição inválida.' });
        return;
    }
    next();
}
