import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getChromaClient } from '@/lib/chromadb'

export async function GET() {
  const status: Record<string, string> = {}

  // Check MongoDB
  try {
    await connectDB()
    status.mongo = 'ok'
  } catch (e) {
    status.mongo = `error: ${(e as Error).message}`
  }

  // Check Chroma Cloud
  try {
    const client = getChromaClient()
    await client.heartbeat()
    status.chroma = 'ok'
  } catch (e) {
    status.chroma = `error: ${(e as Error).message}`
  }

  // Check Groq (LLM)
  try {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set')
    status.groq_llm = 'ok'
  } catch (e) {
    status.groq_llm = `error: ${(e as Error).message}`
  }

  // Check Nomic (embeddings)
  try {
    if (!process.env.NOMIC_API_KEY) throw new Error('NOMIC_API_KEY not set')
    status.nomic_embed = 'ok'
  } catch (e) {
    status.nomic_embed = `error: ${(e as Error).message}`
  }

  // Check required env vars for production stack
  const required = [
    'MONGODB_URI',
    'GROQ_API_KEY',
    'NOMIC_API_KEY',
    'CHROMA_API_KEY',
    'CHROMA_TENANT',
    'CHROMA_DATABASE',
  ]
  const missing = required.filter(k => !process.env[k])
  status.env = missing.length === 0 ? 'ok' : `missing: ${missing.join(', ')}`

  const allOk = Object.values(status).every(v => v === 'ok')

  return NextResponse.json(
    { status, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  )
}