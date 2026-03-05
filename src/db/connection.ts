import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  const uri = process.env['MONGO_URI'];
  if (!uri) {
    logger.warn('MONGO_URI not set — skipping database connection');
    return;
  }

  await mongoose.connect(uri);
  logger.info('MongoDB connected');

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error(err, 'MongoDB error'));
}
