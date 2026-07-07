import { CloudClient } from 'chromadb'

let client: CloudClient | null = null

export function getChromaClient(): CloudClient {
  if (!client) {
    client = new CloudClient({
      apiKey:   process.env.CHROMA_API_KEY!,
      tenant:   process.env.CHROMA_TENANT!,
      database: process.env.CHROMA_DATABASE!,
    })
  }
  return client
}

export async function getCollection(
  userId: string,
  examId: string,
  subject: string
) {
  const c = getChromaClient()
  const safeSubject = subject.toLowerCase().replace(/\s+/g, '_')
  const collectionName = `u_${userId}_e_${examId}_s_${safeSubject}`
  const collection = await c.getOrCreateCollection({
    name: collectionName,
    metadata: { userId, examId, subject },
  })
  return { collection, collectionName }
}

export async function hasChunks(
  userId: string,
  examId: string,
  subject: string
): Promise<boolean> {
  try {
    const { collection } = await getCollection(userId, examId, subject)
    const count = await collection.count()
    return count > 0
  } catch {
    return false
  }
}