import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes';
import { batchWriter } from './workers/batch-writer';
import { decayWorker } from './workers/decay-worker';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/typeahead';

// Middlewares
app.use(cors());
app.use(express.json());

// Bind routes
app.use('/', router);

// Default root route
app.get('/', (_req, res) => {
  res.json({ status: 'Search Typeahead API is online' });
});

// Start Server and Database Connection
async function startServer() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info(`Successfully connected to MongoDB at ${mongoUri}`);

    // Start background worker threads
    batchWriter.start();
    decayWorker.start();

    app.listen(port, () => {
      logger.info(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
const shutdown = async () => {
  logger.info('Received shutdown signal. Stopping background workers...');
  batchWriter.stop();
  decayWorker.stop();
  
  // Flush any remaining batch updates before closing connection
  logger.info('Flushing remaining queries queue...');
  await batchWriter.flush();
  
  logger.info('Closing database connection...');
  await mongoose.connection.close();
  logger.info('Graceful shutdown completed.');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
