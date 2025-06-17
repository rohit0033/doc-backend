import dotenv from 'dotenv';
// Load environment variables early
dotenv.config();

import { Worker } from 'bullmq';
import { connection } from '../queue/queueConfig';
import { JobPayload } from '../types';
import { DatabaseService } from '../db/database';
import { FileService } from '../services/fileService';
import { RAGService } from '../services/ragService';
import { VectorStoreService } from '../services/vectorStoreService';

const ragService = new RAGService();
const vectorStoreService = new VectorStoreService();

console.log('Starting document worker...');

const worker = new Worker<JobPayload>(
  'doc-analysis-queue',
  async (job) => {
    const { jobId, filePath } = job.data;
    
    console.log(`Processing job ${jobId} with file ${filePath}`);

    try {
      // Read file content
      const content = await FileService.readFile(filePath);
      
      if (!content.trim()) {
        throw new Error('File is empty');
      }

      // Run RAG analysis with vector store
      const result = await ragService.analyzeDocument(content, jobId);

      // Update database with results
      await DatabaseService.updateJobCompleted(jobId, result);

      // Optional: Clean up file after processing
      // await FileService.deleteFile(filePath);

      console.log(`Job ${jobId} completed successfully`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Job ${jobId} failed:`, errorMessage);

      // Update database with error
      await DatabaseService.updateJobFailed(jobId, errorMessage);
      
      // Ensure vector store is cleaned up even if job fails
      try {
        if (process.env.CLEANUP_VECTOR_STORE === 'true') {
          await vectorStoreService.deleteCollection(jobId);
        }
      } catch (cleanupError) {
        console.warn(`Failed to clean up vector store for job ${jobId}`, cleanupError);
      }
      
      throw error;
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Document worker started...');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});