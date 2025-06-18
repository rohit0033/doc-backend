import multer from 'multer';
import { StorageService } from './storageService';
import { v4 as uuidv4 } from 'uuid';

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10)
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export class FileService {
  static async readFile(filePath: string): Promise<string> {
    try {
      // If filePath is a Supabase key, use that
      if (!filePath.includes('/')) {
        return await StorageService.getFile(filePath);
      }
      
      // Otherwise, assume it's a full path that we need to extract the filename from
      const filename = filePath.split('/').pop() || filePath;
      return await StorageService.getFile(filename);
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async saveFile(buffer: Buffer, filename: string): Promise<string> {
    try {
      // Generate a unique filename
      const uniqueName = `${Date.now()}-${uuidv4()}-${filename}`;
      
      // Upload directly to Supabase
      await StorageService.uploadFile(buffer, uniqueName);
      
      return uniqueName;
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deleteFile(filePath: string): Promise<void> {
    try {
      // Extract filename from path if needed
      const filename = filePath.split('/').pop() || filePath;
      await StorageService.deleteFile(filename);
    } catch (error) {
      console.warn('Error deleting file:', error);
      // Don't throw, just log
    }
  }
}