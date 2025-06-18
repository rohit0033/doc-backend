import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from "@langchain/qdrant"
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export class VectorStoreService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private client: QdrantClient;
  private readonly embeddingDimension = 1536; // Dimension for text-embedding-ada-002

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 50,
    });

    // Initialize Qdrant client
    if (process.env.QDRANT_URL) {
      // Connect to remote Qdrant instance
      this.client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
      });
      console.log('Using remote Qdrant instance');
    } else {
      // Use local Qdrant instance (default at http://localhost:6333)
      this.client = new QdrantClient({
        url: 'http://localhost:6333',
      });
      console.log('Using local Qdrant instance');
    }
  }

  async storeDocument(content: string, jobId: string): Promise<QdrantVectorStore> {
    try {
      // Create the collection if it doesn't exist
      const collectionName = `job_${jobId}`;
      
      try {
        await this.client.getCollection(collectionName);
        console.log(`Collection ${collectionName} already exists`);
      } catch (e) {
        // Collection doesn't exist, create it
        console.log(`Creating collection ${collectionName}`);
        await this.client.createCollection(collectionName, {
          vectors: {
            size: this.embeddingDimension,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
        });
      }

      // Split document into chunks
      const chunks = await this.textSplitter.splitText(content);
      
      // Create documents with metadata
      const documents = chunks.map((chunk, i) => 
        new Document({
          pageContent: chunk,
          metadata: {
            jobId,
            chunkId: i,
            timestamp: new Date().toISOString(),
          },
        })
      );

      console.log(`Creating vector store for job ${jobId} with ${chunks.length} chunks`);
      
      // Store documents in Qdrant
      const vectorStore = await QdrantVectorStore.fromDocuments(
        documents,
        this.embeddings,
        {
          client: this.client,
          collectionName,
          // Optional: Set TTL for vectors (e.g., 24 hours)
          // Not setting as we'll handle deletion explicitly
        }
      );

      return vectorStore;
    } catch (error) {
      console.error('Vector storage error:', error);
      throw new Error(`Failed to store document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVectorStore(jobId: string): Promise<QdrantVectorStore> {
    const collectionName = `job_${jobId}`;
    return await QdrantVectorStore.fromExistingCollection(
      this.embeddings,
      {
        client: this.client,
        collectionName,
      }
    );
  }

  async deleteCollection(jobId: string): Promise<void> {
    try {
      const collectionName = `job_${jobId}`;
      await this.client.deleteCollection(collectionName);
      console.log(`Deleted vector store for job ${jobId}`);
    } catch (error) {
      console.warn(`Failed to delete vector store for job ${jobId}:`, error);
      // Don't throw error on cleanup failure
    }
  }
}