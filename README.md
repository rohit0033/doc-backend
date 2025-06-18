
# 🧠 Asynchronous Document Analyzer API

This Document Analysis API provides a scalable backend system for uploading, analyzing, and extracting insights from text documents. The system utilizes a queue-based architecture for asynchronous processing, vector storage for efficient document retrieval, and an AI-powered RAG (Retrieval-Augmented Generation) system for document analysis.

---

## 🏗️ Architecture

The system follows a service-oriented architecture with the following components:

- **REST API**: Express.js-based HTTP endpoints for document upload and result retrieval
- **Job Queue**: BullMQ (powered by Redis) for asynchronous document processing
- **Vector Database**: Qdrant for storing document embeddings
- **Database**: PostgreSQL (via Prisma ORM) for tracking job status and storing results
- **AI Analysis**: OpenAI embeddings and LLM for document understanding

🗂️ [Architecture Diagram (Whimsical)](https://whimsical.com/doc-analyzer-31YrqTagy8YjTfewDsbTkc)

---

## ⚙️ Core Components

### 📄 Document Processing Pipeline

1. **Upload**: Document is uploaded and stored in the filesystem
2. **Job Creation**: A job record is created in the database with a `PROCESSING` status
3. **Queue**: Job is added to the BullMQ queue for background processing
4. **Text Processing**: The worker reads and processes the document
5. **Vector Storage**: Document is chunked and stored in Qdrant
6. **Analysis**: RAGService performs analysis using OpenAI
7. **Results**: Analysis results are stored in PostgreSQL
8. **Cleanup**: Optional deletion of vector collections (based on configuration)

---

### 🧠 Vector Storage

The system uses **Qdrant** as the vector database with the following setup:

- **Chunking**: Documents split into 512-token chunks with 50-token overlap
- **Embeddings**: Uses OpenAI’s `text-embedding-ada-002` (1536 dimensions)
- **Similarity**: Uses cosine similarity for vector retrieval
- **Persistence**: Each document gets its own collection named with the jobId
- **Cleanup**: Optionally deletes vector collections after job completion

---

### 🔍 RAG Analysis

The RAG system performs three main tasks:

- **Summary**: One-paragraph summary of the document
- **Topics**: Top 5 topics or keywords
- **Sentiment**: Overall sentiment (Positive, Negative, or Neutral)

---

## 🧪 Development Setup

### 🌐 Environment Variables

Create a `.env` file with the following configuration:

```env
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

# Qdrant
QDRANT_URL="https://your-qdrant-instance.cloud.qdrant.io"
QDRANT_API_KEY="your-qdrant-api-key"
````

---

### 🗃️ Database Schema

**Prisma Schema – `Job` Model**

```prisma
model Job {
  id        String     @id @default(uuid())
  filePath  String     @map("file_path")
  status    JobStatus  @default(PROCESSING)
  summary   String?
  topics    String[]
  sentiment String?
  error     String?
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
}
```

---

## 🚀 Running the Application

Install dependencies:

```bash
npm install
```

Set up the database:

```bash
npm run db:generate
npm run db:push
```

Start the development server and worker:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:server
npm run dev:worker
```

---

## 🧰 Tech Stack

* **Backend Framework**: Express.js
* **Database**: PostgreSQL with Prisma ORM
* **Queue**: BullMQ with Upstash Redis
* **Vector DB**: Qdrant
* **AI Models**: OpenAI GPT-3.5 and `text-embedding-ada-002`
* **Storage**: Local filesystem
* **Language**: TypeScript

---

## 📐 Design Decisions

* **Asynchronous Processing**: Non-blocking job processing via background workers
* **Vector Database**: Qdrant enables efficient semantic retrieval for RAG
* **Persistent Storage**: PostgreSQL used to track job status and store results
* **Cloud Services**: Utilizes Upstash Redis and cloud-hosted Qdrant to reduce ops overhead
* **Configurable Cleanup**: Vector collection cleanup is toggleable via env config

---

## ✅ Best Practices

* **Error Handling**: Robust error handling across services
* **Environment Configuration**: Secured via environment variables
* **Input Validation**: File type and size validation
* **Graceful Shutdown**: Ensures Redis/DB connections close cleanly
* **Status Tracking**: Reliable job lifecycle tracking in database



## 🧠 Design Choices & Trade-offs

### 1. **BullMQ for Job Queueing**

**Why BullMQ:**
We chose BullMQ (built on top of Redis) because of its robust job lifecycle tracking, delayed job support, repeatable jobs, and built-in events that make it easy to monitor background processing. It integrates well with TypeScript and is production-grade with support for retries, rate-limiting, and concurrency control.

**Trade-off:**
BullMQ requires Redis, which adds infrastructure complexity. Additionally, while great for most use cases, very high-throughput systems might benefit from dedicated message brokers like **RabbitMQ** or **Kafka** for fine-grained control and partitioning.

---

### 2. **PostgreSQL + Prisma ORM**

**Why PostgreSQL:**
PostgreSQL offers reliability, relational data modeling, and ACID compliance. Using Prisma ORM simplifies database access and migrations while offering type-safe queries that reduce bugs.

**Trade-off:**
While Prisma is developer-friendly, it abstracts SQL to some extent. Complex queries involving performance tuning may need raw SQL. Also, for document-heavy or schema-less use cases, a NoSQL DB like MongoDB might offer more flexibility.

---

### 3. **Qdrant as Vector Store**

**Why Qdrant:**
Qdrant provides high-performance vector search capabilities, is easy to self-host or use as a cloud service, and supports filtering and named collections. It allows per-job collections, ensuring document isolation.

**Trade-off:**
Spinning up a new collection per document improves traceability but might become a bottleneck at scale. An alternative could be shared collections with tagging, which would reduce overhead but add complexity in filtering.

---

### 4. **OpenAI for Embeddings and RAG**

**Why OpenAI:**
OpenAI's `text-embedding-ada-002` and GPT models are state-of-the-art and easy to integrate via API. They offer high accuracy for summarization, keyword extraction, and sentiment analysis.

**Trade-off:**
These APIs incur usage costs and introduce latency due to network calls. A potential alternative is to use local LLMs or open-source models with GPU acceleration, reducing cost but increasing operational complexity.

---

### 5. **Asynchronous Architecture**

**Why Asynchronous:**
AI analysis (especially LLM inference) can be time-consuming. Decoupling request handling from processing ensures that the API remains responsive and scalable. BullMQ helps queue and distribute the workload.

**Trade-off:**
Users must manually poll the job status, introducing complexity on the frontend. Real-time notifications (e.g., via WebSockets or Webhooks) would improve UX but add implementation overhead.

---





```
