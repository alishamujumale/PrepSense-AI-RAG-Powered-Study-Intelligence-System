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

// Squared L2 distance threshold for Nomic's normalized embeddings.
// Below this = relevant enough to trust; above = treat as no real match.
// Tune this based on real query behavior once you have more usage data.
const RELEVANCE_THRESHOLD = 0.7

export async function routeAndAnswer(
  question:  string,
  userId:    string,
  examId:    string,
  profile:   StudentProfile,
  format:    AnswerFormat = 'explain'
): Promise<QueryResult> {
  const hasNotes = await hasChunks(userId, examId, profile.subject)

  let mode: 'rag' | 'curriculum' = hasNotes ? 'rag' : 'curriculum'
  let chunksUsed = 0
  let userMessage: string

  if (mode === 'rag') {
    const retrieved = await retrieveChunks(question, userId, examId, profile.subject, 5)

    const bestDistance = retrieved.length > 0
      ? Math.min(...retrieved.map(c => c.distance))
      : Infinity

    console.log(`Best chunk distance: ${bestDistance.toFixed(3)} (threshold: ${RELEVANCE_THRESHOLD})`)

    if (bestDistance > RELEVANCE_THRESHOLD) {
      // Nothing retrieved is actually relevant — fall back instead of
      // falsely claiming "from your notes"
      console.log('No chunks passed relevance threshold — falling back to curriculum mode')
      mode = 'curriculum'
    } else {
      const relevantChunks = retrieved.filter(c => c.distance <= RELEVANCE_THRESHOLD)
      chunksUsed = relevantChunks.length
      userMessage = buildRAGPrompt(question, relevantChunks.map(c => c.text))
    }
  }

  if (mode === 'curriculum') {
    userMessage = buildCurriculumPrompt(question)
  }

  const systemPrompt = buildSystemPrompt(profile, format, mode)
  const answer = await generateResponse(systemPrompt, userMessage!)

  console.log(`Query mode: ${mode} | Subject: ${profile.subject} | chunksUsed: ${chunksUsed}`)

  return {
    answer,
    mode,
    chunksUsed,
    pyqRelevance: 0,
  }
}