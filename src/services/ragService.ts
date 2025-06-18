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
      console.log(`Document length: ${content.length} characters`);

      if (content.trim().length < 50) {
      console.log(`Document is too short (${content.length} chars) - returning simplified analysis`);
      return {
        summary: `This is a very brief document containing: "${content.trim()}"`,
        topics: content.trim().split(/\s+/).slice(0, 5),
        sentiment: "Neutral"
      };
    }
      
      // Store document in vector store and get the vector store instance
      const vectorStore = await this.vectorStoreService.storeDocument(content, jobId);
      
      // Query for relevant chunks using the first part of the document as a query
      // This helps find the most relevant chunks for analysis
      const query = content.substring(0, 200); // Take the first 200 chars as a query
      console.log(`Querying vector store for job ${jobId}`);
      const relevantChunks = await vectorStore.similaritySearch(query, 5);
      
      // Combine the retrieved chunks for context
      const contextText = relevantChunks.map(doc => doc.pageContent).join('\n\n');

      console.log("contextText",contextText)
      
      console.log(`Running analysis for job ${jobId}`);
      // Run analysis in parallel for efficiency
      const [summary, topics, sentiment] = await Promise.all([
        this.getSummary(contextText),
        this.getTopics(contextText),
        this.getSentiment(contextText),
      ]);
      console.log("summary",summary)
      console.log("topics",topics)
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
  const prompt = `
    Summarize the following document content in one paragraph. 
    If the content is extremely brief or appears to be a test file, simply describe what you see 
    without embellishment or assumptions about broader context. 
    Be factual and concise about what is actually in the document:

    ${text}
  `;
    const response = await this.llm.invoke(prompt);
    return response.content.toString().trim();
  }

  private async getTopics(text: string): Promise<string[]> {
   const prompt = `
    Extract the top keywords or topics discussed in this document.
    If the document appears to be a test file or contains minimal content, 
    only list words that actually appear in the text.
    Return only the topics separated by commas:

    ${text}
  `;
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