import { Router } from 'express';
import { upload } from '../services/fileService';
import { AnalyzeController } from '../controllers/analyzeController';

const router = Router();

router.post('/analyze', upload.single('file'), AnalyzeController.uploadDocument);
router.get('/analyze/:jobId/status', AnalyzeController.getJobStatus);
router.get('/analyze/:jobId/result', AnalyzeController.getJobResult);

export default router;