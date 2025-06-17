import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { JobPayload } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('REDIS_URL:', process.env.UPSTASH_REDIS_PASSWORD);
const redisPassword = process.env.UPSTASH_REDIS_PASSWORD;
// Create Redis connection that can be exported
const connection = new IORedis({
  host: "touched-cockatoo-50099.upstash.io",
  port: 6379,
  password:redisPassword,
  tls: {}, // Required for Upstash Redis
  maxRetriesPerRequest: null, // Changed from 3 to null as required by BullMQ
  enableReadyCheck: false // Recommended for cloud Redis providers
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

connection.on('connect', () => {
  console.log('Successfully connected to Redis');
});

// Create queue with the same connection
export const documentQueue = new Queue<JobPayload>('doc-analysis-queue', {
  connection, // Use the connection object
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Export the connection for use in workers
export { connection };