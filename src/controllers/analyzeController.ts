import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { documentQueue } from '../queue/queueConfig';
import { DatabaseService } from '../db/database';
import { ApiResponse, JobResponse } from '../types';
import { FileService } from '../services/fileService';

export class AnalyzeController {
  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      console.log("Upload request received");
      console.log("Request file:", req.file ? "File present" : "No file found");
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        } as ApiResponse);
        return;
      }

      const jobId = uuidv4();
      const buffer = req.file.buffer;
      const filename = req.file.originalname;
      
      // Save file to Supabase directly
      const filePath = await FileService.saveFile(buffer, filename);

      // Create job in database
      await DatabaseService.createJob(jobId, filePath);

      // Add job to queue
      await documentQueue.add('analyze-document', {
        jobId,
        filePath,
      });

      res.status(201).json({
        success: true,
        data: { jobId },
      } as ApiResponse<{ jobId: string }>);

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await DatabaseService.getJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        } as ApiResponse);
        return;
      }

      const response: JobResponse = {
        jobId: job.id,
        status: job.status.toLowerCase() as any,
      };

      res.json({
        success: true,
        data: response,
      } as ApiResponse<JobResponse>);

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }

  static async getJobResult(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await DatabaseService.getJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        } as ApiResponse);
        return;
      }

      const response: JobResponse = {
        jobId: job.id,
        status: job.status.toLowerCase() as any,
      };

      if (job.status === 'COMPLETED') {
        response.summary = job.summary!;
        response.topics = job.topics;
        response.sentiment = job.sentiment!;
      } else if (job.status === 'FAILED') {
        response.error = job.error!;
      }

      res.json({
        success: true,
        data: response,
      } as ApiResponse<JobResponse>);

    } catch (error) {
      console.error('Result fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
}