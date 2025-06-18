import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ SUPABASE_URL and SUPABASE_KEY must be defined in environment variables');
  // We don't exit the process, as this might be caught by upper layers
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export class StorageService {
  private static bucketName = 'documents';
  private static maxRetries = 3;

  /**
   * Upload a file to Supabase Storage with retries
   */
  static async uploadFile(buffer: Buffer, fileName: string): Promise<string> {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Uploading file to Supabase: ${fileName} (attempt ${attempt}/${this.maxRetries})`);
        
        const { data, error } = await supabase.storage
          .from(this.bucketName)
          .upload(fileName, buffer, {
            contentType: 'text/plain',
            upsert: true
          });

        if (error) {
          throw error;
        }

        console.log(`✓ File uploaded successfully to Supabase: ${fileName}`);
        return fileName;
      } catch (error) {
        console.error(`Error uploading file (attempt ${attempt}/${this.maxRetries}):`, error);
        lastError = error;
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // 1000ms, 2000ms, 4000ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to upload file after ${this.maxRetries} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
  }

  /**
   * Download a file from Supabase Storage with retries
   */
  static async getFile(fileName: string): Promise<string> {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Downloading file from Supabase: ${fileName} (attempt ${attempt}/${this.maxRetries})`);
        
        const { data, error } = await supabase.storage
          .from(this.bucketName)
          .download(fileName);

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(`File not found: ${fileName}`);
        }

        // Convert blob to text
        const content = await data.text();
        console.log(`✓ File downloaded successfully from Supabase: ${fileName}`);
        return content;
      } catch (error) {
        console.error(`Error downloading file (attempt ${attempt}/${this.maxRetries}):`, error);
        lastError = error;
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to download file after ${this.maxRetries} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
  }

  /**
   * Delete a file from Supabase Storage (best effort)
   */
  static async deleteFile(fileName: string): Promise<void> {
    try {
      console.log(`Deleting file from Supabase: ${fileName}`);
      
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        throw error;
      }

      console.log(`✓ File deleted successfully from Supabase: ${fileName}`);
    } catch (error) {
      console.warn(`Warning: Failed to delete file from Supabase: ${fileName}`, error);
      // Just log the warning - don't throw
    }
  }
}