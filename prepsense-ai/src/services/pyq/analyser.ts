import { generateResponse } from '@/lib/llm'

export interface ExtractedQuestion {
  text:  string
  topic: string
}

/**
 * Step 1 — Extract individual questions from raw PYQ text.
 * PYQ papers are messy — numbered questions, sub-parts, marks in brackets.
 * We use the LLM to pull out clean, individual questions.
 */
export async function extractQuestions(rawText: string): Promise<string[]> {
  // Truncate to avoid overwhelming the small model — process in one pass
  const text = rawText.substring(0, 3000)

  const systemPrompt = `You extract exam questions from raw text. 
Return ONLY a numbered list of questions, one per line, no extra commentary.
Ignore marks, instructions, and headers. Only real questions.`

  const userPrompt = `Extract all distinct questions from this text:\n\n${text}`

  const response = await generateResponse(systemPrompt, userPrompt)

  // Parse numbered list into array
  const questions = response
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(line => line.length > 15) // discard junk/empty lines

  return questions
}

/**
 * Step 2 — Classify each question into a topic.
 * We batch questions together in one LLM call to save time/cost.
 */
export async function classifyTopics(
  questions: string[],
  subject: string
): Promise<ExtractedQuestion[]> {
  if (questions.length === 0) return []

  // Process in batches of 8 to keep prompts small and fast
  const BATCH_SIZE = 8
  const results: ExtractedQuestion[] = []

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE)

    const numbered = batch.map((q, idx) => `${idx + 1}. ${q}`).join('\n')

    const systemPrompt = `You classify ${subject} exam questions into short topic names (2-4 words).
Return ONLY lines in format: "N: TopicName" — one per question, matching the input numbering.
Use consistent topic names across similar questions (e.g. always "Normalization" not sometimes "DB Normalization").`

    const userPrompt = `Classify these questions:\n${numbered}`

    try {
      const response = await generateResponse(systemPrompt, userPrompt)

      const lines = response.split('\n').filter(l => l.trim())

      for (const line of lines) {
        const match = line.match(/^(\d+):\s*(.+)$/)
        if (match) {
          const idx = parseInt(match[1]) - 1
          const topic = match[2].trim()
          if (batch[idx]) {
            results.push({ text: batch[idx], topic })
          }
        }
      }
    } catch (error) {
      console.error(`Failed to classify batch ${i}-${i + BATCH_SIZE}:`, error)
      // Skip failed batch, continue with next
    }
  }

  return results
}

/**
 * Step 3 — Compute frequency and rank topics.
 */
export interface TopicFrequency {
  topic:           string
  count:           number
  percentage:      number
  sampleQuestions: string[]
}

export function rankTopics(classified: ExtractedQuestion[]): TopicFrequency[] {
  const topicMap = new Map<string, string[]>()

  for (const item of classified) {
    // Normalize topic name (lowercase for grouping, but keep original casing for display)
    const key = item.topic.toLowerCase().trim()
    if (!topicMap.has(key)) {
      topicMap.set(key, [])
    }
    topicMap.get(key)!.push(item.text)
  }

  const total = classified.length
  const ranked: TopicFrequency[] = []

  for (const [topicKey, questionsForTopic] of topicMap.entries()) {
    // Use the original casing from the first occurrence
    const displayTopic = topicKey.replace(/\b\w/g, c => c.toUpperCase())

    ranked.push({
      topic:      displayTopic,
      count:      questionsForTopic.length,
      percentage: Math.round((questionsForTopic.length / total) * 100),
      sampleQuestions: questionsForTopic.slice(0, 3), // show up to 3 examples
    })
  }

  // Sort by frequency, most important first
  ranked.sort((a, b) => b.count - a.count)

  return ranked
}

/**
 * Full pipeline — run extraction, classification, and ranking together.
 */
export async function analyzePYQs(
  rawText: string,
  subject: string
): Promise<{ totalQuestions: number; topicRanking: TopicFrequency[] }> {
  console.log('Extracting questions...')
  const questions = await extractQuestions(rawText)
  console.log(`✓ Extracted ${questions.length} questions`)

  console.log('Classifying topics...')
  const classified = await classifyTopics(questions, subject)
  console.log(`✓ Classified ${classified.length} questions`)

  console.log('Ranking topics...')
  const topicRanking = rankTopics(classified)
  console.log(`✓ Ranked ${topicRanking.length} unique topics`)

  return {
    totalQuestions: classified.length,
    topicRanking,
  }
}