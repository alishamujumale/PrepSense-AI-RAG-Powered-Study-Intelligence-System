import Groq from 'groq-sdk'

const GROQ_API_KEY  = process.env.GROQ_API_KEY!
const NOMIC_API_KEY = process.env.NOMIC_API_KEY!
const IS_PROD       = process.env.NODE_ENV === 'production'

let groqClient: Groq | null = null

export function getLLMClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: GROQ_API_KEY })
  }
  return groqClient
}

export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  model: string = 'llama-3.1-8b-instant'
): Promise<string> {
  const client = getLLMClient()

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    temperature: 0.3,
    max_tokens:  1024,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (IS_PROD || NOMIC_API_KEY) {
    // Production — use Nomic cloud API
    return await getNomicEmbedding(text)
  } else {
    // Local dev fallback — use Ollama
    return await getOllamaEmbedding(text)
  }
}

async function getNomicEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOMIC_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nomic-embed-text-v1.5',
      texts: [text],
      task_type: 'search_document',
    }),
  })

  if (!response.ok) {
    throw new Error(`Nomic API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.embeddings[0]
}

async function getOllamaEmbedding(text: string): Promise<number[]> {
  const { Ollama } = await import('ollama')
  const ollama = new Ollama({ 
    host: process.env.OLLAMA_URL ?? 'http://localhost:11434' 
  })

  const response = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt: text,
  })

  return response.embedding
}