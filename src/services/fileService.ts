import { StorageService } from './storageService';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import { Express } from 'express';

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store temporarily in uploads directory
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  },
});
// Configure file filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept text files only
  if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
    cb(null, true);
  } else {
    cb(new Error('Only .txt files are allowed'));
  }
};


// Create multer instance for handling file uploads
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10), // 1MB default
  },
});

export class FileService {
  static async readFile(filePath: string): Promise<string> {
    try {
      // First, check if this is a local path from multer upload
      if (fs.existsSync(filePath)) {
        // Read the temp file from local storage
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Upload to Supabase for permanent storage
        const fileName = path.basename(filePath);
        await StorageService.uploadFile(Buffer.from(content), fileName);
        
        // Clean up the temp file
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Failed to delete temp file:', e); }
        
        // Return the content
        return content;
      }
      
      // If not a local path, assume it's a filename in Supabase
      const fileName = path.basename(filePath);
      return await StorageService.getFile(fileName);
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      // Check if this is a local path and delete if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Also delete from Supabase
      const fileName = path.basename(filePath);
      await StorageService.deleteFile(fileName);
    } catch (error) {
      console.warn('Error deleting file:', error);
      // Just log the warning - don't throw
    }
  }
}