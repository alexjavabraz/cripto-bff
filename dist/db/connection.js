"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
async function connectDatabase() {
    const uri = process.env['MONGO_URI'];
    if (!uri) {
        logger_1.logger.warn('MONGO_URI not set — skipping database connection');
        return;
    }
    await mongoose_1.default.connect(uri);
    logger_1.logger.info('MongoDB connected');
    mongoose_1.default.connection.on('disconnected', () => logger_1.logger.warn('MongoDB disconnected'));
    mongoose_1.default.connection.on('error', (err) => logger_1.logger.error(err, 'MongoDB error'));
}
