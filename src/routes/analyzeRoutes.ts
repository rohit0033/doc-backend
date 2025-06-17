import { Router } from 'express';
import { upload } from '../services/fileService';
import { AnalyzeController } from '../controllers/analyzeController';

const router = Router();

// Upload document for analysis
router.post('/analyze', upload.single('file'), AnalyzeController.uploadDocument);

// Get job status
router.get('/analyze/:jobId/status', AnalyzeController.getJobStatus);

// Get job result
router.get('/analyze/:jobId/result', AnalyzeController.getJobResult);

export default router;