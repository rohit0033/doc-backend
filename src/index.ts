import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import analyzeRoutes from './routes/analyzeRoutes';
import { prisma } from './db/database';

// Load environment variables
dotenv.config();
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error);
}
console.log('Environment variables loaded:', {
  REDIS_URL_EXISTS: !!process.env.REDIS_URL,
  REDIS_URL_LENGTH: process.env.REDIS_URL ? process.env.REDIS_URL.length : 0,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', analyzeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});