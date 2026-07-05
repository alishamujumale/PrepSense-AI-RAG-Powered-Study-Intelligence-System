# PrepSense AI

PrepSense AI is a full-stack study assistant for students that turns uploaded academic materials into an exam-focused AI workspace. The app helps users create exam profiles, upload notes and papers, and chat with an AI system that answers using the content they provided rather than generic knowledge alone.

## What this project does

- Lets users register and sign in securely
- Creates exam-specific profiles for subjects and study goals
- Supports upload and management of academic documents
- Enables document-grounded chat using retrieval-augmented generation (RAG)
- Organizes conversations and study context around each exam

## Key features

- Authenticated student dashboard
- Exam creation and switching
- Document upload and document listing
- Subject-based chat experience
- AI responses grounded in uploaded content
- Vector search and embedding-based retrieval

## Tech stack

- Frontend: Next.js + React
- Backend: Next.js API routes
- Authentication: NextAuth.js
- Database: MongoDB
- Vector database: ChromaDB
- LLM: Groq
- Embeddings: Nomic AI, with Ollama fallback for local development

## Project structure

- prepsense-ai/src/app: pages and API routes
- prepsense-ai/src/components: shared UI components
- prepsense-ai/src/lib: database, auth, and LLM helpers
- prepsense-ai/src/services: document processing, retrieval, and routing logic

## Prerequisites

- Node.js 20+
- npm
- A MongoDB instance
- A Groq API key
- Optional: Ollama for local embeddings

## Environment variables

Create a .env.local file inside the prepsense-ai folder with:

```env
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
NOMIC_API_KEY=your_nomic_api_key
OLLAMA_URL=http://localhost:11434
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

## Getting started

```bash
cd prepsense-ai
npm install
npm run dev
```

Then open http://localhost:3000.

## Typical workflow

1. Register or log in
2. Create an exam profile
3. Upload relevant notes, syllabus, or previous-year papers
4. Open chat and ask questions about a subject
5. Use the AI responses as a study aid grounded in your uploaded content

## Notes

This project focuses on practical exam preparation and document-grounded learning. It is designed as a modern AI application that combines authentication, document handling, vector search, and conversational study support in one place.

## License

This project is licensed under the MIT License.
