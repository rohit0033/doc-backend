import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype === 'text/plain' && path.extname(file.originalname) === '.txt') {
    cb(null, true);
  } else {
    cb(new Error('Only .txt files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576'), // 1MB
  },
});

export class FileService {
  static readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  static deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}