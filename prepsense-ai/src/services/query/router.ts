import { hasChunks } from '@/lib/chromadb'
import { retrieveChunks } from '@/services/rag/retriever'
import { generateResponse } from '@/lib/llm'
import {
  buildSystemPrompt,
  buildRAGPrompt,
  buildCurriculumPrompt,
  StudentProfile,
  AnswerFormat,
} from './promptBuilder'

export interface QueryResult {
  answer:       string
  mode:         'rag' | 'curriculum'
  chunksUsed:   number
  pyqRelevance: number
}

export async function routeAndAnswer(
  question:  string,
  userId:    string,
  examId:    string,
  profile:   StudentProfile,
  format:    AnswerFormat = 'explain'
): Promise<QueryResult> {

  // Step 1 — Check if student has notes in ChromaDB
  const hasNotes = await hasChunks(userId, examId, profile.subject)
  const mode: 'rag' | 'curriculum' = hasNotes ? 'rag' : 'curriculum'

  console.log(`Query mode: ${mode} | Subject: ${profile.subject} | hasNotes: ${hasNotes}`)

  // Step 2 — Build system prompt
  const systemPrompt = buildSystemPrompt(profile, format, mode)

  let userMessage: string
  let chunksUsed = 0

  if (mode === 'rag') {
    // Step 3a — Retrieve relevant chunks
    const chunks = await retrieveChunks(
      question,
      userId,
      examId,
      profile.subject,
      5   // top-5 chunks
    )
    chunksUsed = chunks.length
    console.log(`Retrieved ${chunks.length} chunks for query`)

    // Step 3b — Build RAG prompt with context
    userMessage = buildRAGPrompt(question, chunks)
  } else {
    // Step 3c — Curriculum mode — no retrieval needed
    userMessage = buildCurriculumPrompt(question)
  }

  // Step 4 — Generate answer with Llama3.2
  const answer = await generateResponse(systemPrompt, userMessage)

  return {
    answer,
    mode,
    chunksUsed,
    pyqRelevance: 0,   // will be filled in Phase 4 when PYQ analyzer is built
  }
}