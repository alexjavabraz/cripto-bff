"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const balance_store_1 = require("../services/balance-store");
const router = (0, express_1.Router)();
// GET /user/balance
router.get('/balance', authenticate_1.authenticate, (req, res) => {
    const balance = balance_store_1.balanceStore.get(req.user.id);
    res.json(balance);
});
exports.default = router;
