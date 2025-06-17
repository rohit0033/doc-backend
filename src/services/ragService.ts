import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { AnalysisResult } from '../types';
import { VectorStoreService } from './vectorStoreService';
import dotenv from 'dotenv';

dotenv.config();

export class RAGService {
  private llm: ChatOpenAI;
  private vectorStoreService: VectorStoreService;
  
  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
    });

    this.vectorStoreService = new VectorStoreService();
  }

  async analyzeDocument(content: string, jobId: string): Promise<AnalysisResult> {
    try {
      console.log(`Starting analysis for job ${jobId}`);
      
      // Store document in vector store and get the vector store instance
      const vectorStore = await this.vectorStoreService.storeDocument(content, jobId);
      
      // Query for relevant chunks using the first part of the document as a query
      // This helps find the most relevant chunks for analysis
      const query = content.substring(0, 200); // Take the first 200 chars as a query
      console.log(`Querying vector store for job ${jobId}`);
      const relevantChunks = await vectorStore.similaritySearch(query, 5);
      
      // Combine the retrieved chunks for context
      const contextText = relevantChunks.map(doc => doc.pageContent).join('\n\n');
      
      console.log(`Running analysis for job ${jobId}`);
      // Run analysis in parallel for efficiency
      const [summary, topics, sentiment] = await Promise.all([
        this.getSummary(contextText),
        this.getTopics(contextText),
        this.getSentiment(contextText),
      ]);
      
      // Cleanup vector store if configured to do so
      if (process.env.CLEANUP_VECTOR_STORE === 'true') {
        console.log(`Cleaning up vector store for job ${jobId}`);
        await this.vectorStoreService.deleteCollection(jobId);
      }
      
      return {
        summary,
        topics,
        sentiment,
      };
    } catch (error) {
      console.error(`RAG Analysis error for job ${jobId}:`, error);
      
      // Try to clean up on error if configured
      if (process.env.CLEANUP_VECTOR_STORE === 'true') {
        try {
          await this.vectorStoreService.deleteCollection(jobId);
        } catch (cleanupError) {
          console.warn(`Failed to clean up vector store for job ${jobId}:`, cleanupError);
        }
      }
      
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // The remaining methods can stay the same
  private async getSummary(text: string): Promise<string> {
    const prompt = `Summarize the following document in one paragraph:\n\n${text}`;
    const response = await this.llm.invoke(prompt);
    return response.content.toString().trim();
  }

  private async getTopics(text: string): Promise<string[]> {
    const prompt = `Extract the top 5 keywords or topics discussed in this document. Return only the topics separated by commas:\n\n${text}`;
    const response = await this.llm.invoke(prompt);
    const content = response.content.toString();
    return content.split(',').map((topic: string) => topic.trim()).slice(0, 5);
  }

  private async getSentiment(text: string): Promise<'Positive' | 'Negative' | 'Neutral'> {
    const prompt = `Determine if the sentiment of this text is Positive, Negative, or Neutral. Return only one word:\n\n${text}`;
    const response = await this.llm.invoke(prompt);
    const sentiment = response.content.toString().trim().toLowerCase();
    
    if (sentiment.includes('positive')) return 'Positive';
    if (sentiment.includes('negative')) return 'Negative';
    return 'Neutral';
  }
}