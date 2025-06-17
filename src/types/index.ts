export interface JobPayload {
  jobId: string;
  filePath: string;
}

export interface AnalysisResult {
  summary: string;
  topics: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JobResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  summary?: string;
  topics?: string[];
  sentiment?: string;
  error?: string;
}

export enum JobStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}