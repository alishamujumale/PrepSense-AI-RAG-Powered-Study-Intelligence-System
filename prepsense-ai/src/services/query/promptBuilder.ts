export interface StudentProfile {
  board:    string    // e.g. "CBSE", "JEE", "NEET"
  stream:   string    // e.g. "PCM", "PCB", "Commerce"
  standard: string    // e.g. "Class 12", "Undergraduate"
  subject:  string    // e.g. "Physics", "DBMS"
  examName: string    // e.g. "JEE Mains 2026"
}

export type AnswerFormat = '2mark' | '5mark' | '10mark' | 'explain'

const FORMAT_INSTRUCTIONS: Record<AnswerFormat, string> = {
  '2mark':  'Answer in 2-3 sentences. Be direct and precise. No elaboration.',
  '5mark':  'Answer in 3-5 points. Include key concepts, one example if relevant.',
  '10mark': 'Answer in detail. Cover definition, explanation, examples, diagrams description if needed, and applications.',
  'explain': 'Explain clearly as if teaching a student. Use simple language, analogies, and step-by-step breakdown.',
}

export function buildSystemPrompt(
  profile: StudentProfile,
  format: AnswerFormat,
  mode: 'rag' | 'curriculum',
  pyqTopics?: string[]
): string {
  const formatInstruction = FORMAT_INSTRUCTIONS[format]

  const pyqHint = pyqTopics && pyqTopics.length > 0
    ? `\nHigh-frequency PYQ topics for this subject: ${pyqTopics.join(', ')}. Flag if the question relates to these.`
    : ''

  const sourceInstruction = mode === 'rag'
    ? `Answer STRICTLY based on the provided context from the student's notes. 
If the answer is not in the context, say "This topic is not covered in your uploaded notes."
Always mention which part of the notes supports your answer.`
    : `Answer based on the standard ${profile.board} ${profile.standard} ${profile.subject} syllabus.
Scope your answer strictly to what is expected at ${profile.standard} level for ${profile.board}.
Do not go beyond the syllabus scope.`

  return `You are PrepSense AI — an expert study assistant and tutor.

Student Profile:
- Board/Exam: ${profile.board}
- Stream: ${profile.stream}  
- Standard: ${profile.standard}
- Subject: ${profile.subject}
- Preparing for: ${profile.examName}

Answer Format: ${formatInstruction}

Source Rule:
${sourceInstruction}
${pyqHint}

Rules:
1. Never hallucinate — only state what you know or what is in the context
2. Use proper technical terminology for ${profile.subject}
3. If a concept appears frequently in PYQs, mention "⭐ PYQ Important"
4. End every answer with: "📚 Source: [Notes/Syllabus]"
5. Keep the tone of a helpful tutor, not a textbook`
}

export function buildRAGPrompt(
  question: string,
  retrievedChunks: string[]
): string {
  const context = retrievedChunks
    .map((chunk, i) => `[Context ${i + 1}]:\n${chunk}`)
    .join('\n\n')

  return `Context from student's notes:
${context}

Student's Question: ${question}

Answer the question based on the context above:`
}

export function buildCurriculumPrompt(question: string): string {
  return `Student's Question: ${question}

Answer based on the standard syllabus:`
}