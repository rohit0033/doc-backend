This document analysis API provides a scalable backend system for uploading, analyzing, and extracting insights from text documents. The system utilizes a queue-based architecture to handle asynchronous processing, vector storage for efficient document retrieval, and an AI-powered RAG (Retrieval-Augmented Generation) system for document analysis.

Architecture
The system follows a service-oriented architecture with the following components:

REST API: Express.js based HTTP endpoints for document upload and analysis results retrieval
Job Queue: BullMQ (powered by Redis) for asynchronous document processing
Vector Database: Qdrant for storing document embeddings
Database: PostgreSQL (via Prisma ORM) for storing job status and results
AI Analysis: OpenAI embeddings and LLM for document understanding
<img alt="Architecture Diagram" src="https://mermaid.ink/img/pako:eNqNkl9rgzAUxb_KJU-DQbW2VctgD2VsG-wr9KGYm2rAJpGkldX57Wd0tKxjT-ElOeee-_eK5mUuMI7AUdiwAsvdOS-Elm8sXmKrxJvOs9Znc0lSkoGpy5asJj-fds6HdIQPaQe5GE_kemj74BxqQbaoWMFS2Bf1aC_1JkpEpMFfR2LDfHKx2ZXVzlGb_fYoO0K2rNCQoLQbKGoq0dGK2yZo60UVdSgspRmUCTQl6OPmBv8dijRWX5g4aDruXyJO07nluu7C9xfhrL5kwfnCm_nB6TvXzhOtg9IkrN0du13XtqzVrOKgma5gsRc-ZU3iV7dJTbVQKVvDM46k5BiGFoZV58DKlO29fKf2IBg4FLSKWlBcBdQYqmNhMznb91WDwIJPDC4MjnBEPVcDRzRQxLEr98_BQG1iiYxXpeJ4Q9-PfU9_vz-5huY?type=png">


Core Components
Document Processing Pipeline
Upload: Document is uploaded and stored in the filesystem
Job Creation: A job record is created in the database with PROCESSING status
Queue: The job is added to the BullMQ queue for asynchronous processing
Text Processing: The document is read and processed by the worker
Vector Storage: The document is split into chunks and stored in Qdrant
Analysis: The RAGService analyzes the document using OpenAI
Results: The analysis results are stored in the database
Cleanup: Optionally, the vector store collection can be deleted based on configuration
Vector Storage
The system uses Qdrant as a vector database to store document embeddings with the following configuration:

Chunking: Documents are split into 512-token chunks with 50-token overlap
Embeddings: OpenAI's text-embedding-ada-002 model (1536 dimensions)
Similarity: Cosine similarity for retrieval
Persistence: Each document gets its own collection with jobId-based naming
Cleanup: Optional deletion of collections after job completion (configurable)
RAG Analysis
The RAG system performs three main analyses:

Summary: A concise paragraph summarizing the document contents
Topics: The top 5 topics or keywords from the document
Sentiment: Overall sentiment (Positive, Negative, or Neutral)
Development Setup
Environment Variables
Create a .env file with the following variables:

# Database
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Redis (Upstash)
REDIS_URL="rediss://default:password@host:port"
UPSTASH_REDIS_PASSWORD="password"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Server
PORT=3000
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=1048576
UPLOAD_DIR=./uploads

# Vector Store
CLEANUP_VECTOR_STORE=false

# Qdrant Configuration
QDRANT_URL="https://your-qdrant-instance.cloud.qdrant.io"
QDRANT_API_KEY="your-qdrant-api-key"

# Database Schema
The system uses PostgreSQL with Prisma ORM. The schema includes:
model Job {
  id        String    @id @default(uuid())
  filePath  String    @map("file_path")
  status    JobStatus @default(PROCESSING)
  summary   String?
  topics    String[]
  sentiment String?
  error     String?
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("jobs")
}

enum JobStatus {
  PROCESSING
  COMPLETED
  FAILED
}

Running the Application
Install dependencies:
npm install
Set up the database:
`npm run db:generate
npm run db:push `

Start the development server and worker:
`npm run dev`

Or run them separately:
`npm run dev:server
npm run dev:worker`

Tech Stack
Backend Framework: Express.js
Database: PostgreSQL with Prisma ORM
Queue: BullMQ with Upstash Redis
Vector Database: Qdrant
AI Models: OpenAI GPT-3.5 and text-embedding-ada-002
File Storage: Local filesystem
Language: TypeScript

Design Decisions
Asynchronous Processing: Documents are processed asynchronously to handle long-running AI operations and provide immediate feedback to users.
Vector Database: Qdrant provides efficient semantic search capabilities for document chunks, allowing the RAG system to retrieve the most relevant context.
Persistent Storage: Analysis results are stored in PostgreSQL for reliability and easy querying.

Cloud Services: The system uses managed services (Upstash Redis, cloud Qdrant) to minimize operational overhead.

Configurable Cleanup: Vector collections can be retained or deleted based on configuration, allowing for both ephemeral and persistent document storage strategies.

Best Practices
Error Handling: Comprehensive error handling throughout the application
Environment Variables: Configuration via environment variables for security and flexibility
Input Validation: File size and type validation for uploads
Graceful Shutdown: Proper cleanup of connections on process termination
Status Tracking: Clear job status tracking throughout the processing pipeline
Limitations and Future Improvements
File Types: Currently only supports .txt files; future versions could support PDF, DOCX, etc.
Authentication: Add authentication and authorization for secure API access
Rate Limiting: Implement rate limiting to prevent abuse
Monitoring: Add detailed monitoring and logging
Scalability: Implement horizontal scaling for workers
Caching: Add caching for frequently accessed analysis results
