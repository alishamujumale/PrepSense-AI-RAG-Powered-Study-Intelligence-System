import { getCollection } from '@/lib/chromadb'
import { generateEmbedding } from '@/lib/llm'
import { EmbeddedChunk } from './embedder'
import { ChunkMetadata } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export async function storeChunks(
  chunks: EmbeddedChunk[],
  metadata: Omit<ChunkMetadata, 'chunkIndex'>
): Promise<void> {
  if (chunks.length === 0) {
    console.log('⚠ No chunks to store — skipping ChromaDB write')
    return
  }
  const { collection } = await getCollection(
    metadata.userId,
    metadata.examId,
    metadata.subject
  )
  const ids        = chunks.map(() => uuidv4())
  const embeddings = chunks.map(c => c.embedding)
  const documents  = chunks.map(c => c.text)
  const metadatas  = chunks.map(c => ({
    userId:     metadata.userId,
    examId:     metadata.examId,
    subject:    metadata.subject,
    docId:      metadata.docId,
    docType:    metadata.docType,
    chunkIndex: c.chunkIndex,
  }))
  await collection.add({
    ids,
    embeddings,
    documents,
    metadatas,
  })
  console.log(`✓ Stored ${chunks.length} chunks in ChromaDB`)
}

export interface RetrievedChunk {
  text: string
  distance: number
}

export async function retrieveChunks(
  query: string,
  userId: string,
  examId: string,
  subject: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const { collection } = await getCollection(userId, examId, subject)
  const queryEmbedding = await generateEmbedding(query)
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  })
  const docs      = results.documents?.[0] ?? []
  const distances = results.distances?.[0] ?? []

  return docs
    .map((d, i) => ({ text: d, distance: distances[i] }))
    .filter((c): c is RetrievedChunk => c.text !== null && c.distance !== undefined)
}