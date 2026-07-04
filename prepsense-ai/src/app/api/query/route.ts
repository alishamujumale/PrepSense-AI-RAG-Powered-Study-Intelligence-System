import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { routeAndAnswer } from '@/services/query/router'
import { AnswerFormat } from '@/services/query/promptBuilder'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const body = await req.json()

    const {
      question,
      userId,
      examId,
      subject,
      board    = 'CBSE',
      stream   = 'General',
      standard = 'Undergraduate',
      examName = 'Final Exam',
      format   = 'explain',
    } = body

    // Validate required fields
    if (!question || !userId || !examId || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: question, userId, examId, subject' },
        { status: 400 }
      )
    }

    if (!['2mark','5mark','10mark','explain'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be: 2mark, 5mark, 10mark, or explain' },
        { status: 400 }
      )
    }

    console.log(`\n--- New Query ---`)
    console.log(`Question: ${question}`)
    console.log(`Subject: ${subject} | Format: ${format}`)

    const result = await routeAndAnswer(
      question,
      userId,
      examId,
      { board, stream, standard, subject, examName },
      format as AnswerFormat
    )

    return NextResponse.json({
      success:    true,
      question,
      answer:     result.answer,
      mode:       result.mode,
      chunksUsed: result.chunksUsed,
      subject,
      format,
    })

  } catch (error) {
    console.error('Query error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}