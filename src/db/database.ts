import { PrismaClient } from '@prisma/client';
import { AnalysisResult,JobStatus } from '../types';
export const prisma = new PrismaClient();

export class DatabaseService {
  static async createJob(jobId: string, filePath: string) {
    return await prisma.job.create({
      data: {
        id: jobId,
        filePath,
        status: JobStatus.PROCESSING,
      },
    });
  }

  static async getJob(jobId: string) {
    return await prisma.job.findUnique({
      where: { id: jobId },
    });
  }

  static async updateJobCompleted(jobId: string, result: AnalysisResult) {
    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        summary: result.summary,
        topics: result.topics,
        sentiment: result.sentiment,
        updatedAt: new Date(),
      },
    });
  }

  static async updateJobFailed(jobId: string, error: string) {
    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error,
        updatedAt: new Date(),
      },
    });
  }
}