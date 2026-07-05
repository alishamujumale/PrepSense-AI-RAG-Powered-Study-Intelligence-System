import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Exam from '@/models/Exam'
import ChatMessage from '@/models/ChatMessage'
import { routeAndAnswer } from '@/services/query/router'
import { AnswerFormat } from '@/services/query/promptBuilder'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = (session.user as any).id

    await connectDB()

    const body = await req.json()
    const { question, examId, subject, format = 'explain' } = body

    if (!question || !examId || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: question, examId, subject' },
        { status: 400 }
      )
    }

    if (!['2mark', '5mark', '10mark', 'explain'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be: 2mark, 5mark, 10mark, or explain' },
        { status: 400 }
      )
    }

    const exam = await Exam.findOne({ _id: examId, userId })
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found or does not belong to this user' },
        { status: 403 }
      )
    }

    await ChatMessage.create({
      userId, examId, subject, role: 'user', content: question, format,
    })

    const result = await routeAndAnswer(
      question,
      userId,
      examId,
      {
        board:    exam.board,
        stream:   exam.stream,
        standard: exam.standard,
        subject,
        examName: exam.name,
      },
      format as AnswerFormat
    )

    const savedReply = await ChatMessage.create({
      userId, examId, subject, role: 'assistant',
      content:    result.answer,
      mode:       result.mode,
      chunksUsed: result.chunksUsed,
      format,
    })

    return NextResponse.json({
      success:    true,
      answer:     result.answer,
      mode:       result.mode,
      chunksUsed: result.chunksUsed,
      messageId:  savedReply._id,
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = (session.user as any).id

    await connectDB()

    const { searchParams } = new URL(req.url)
    const examId  = searchParams.get('examId')
    const subject = searchParams.get('subject')

    if (!examId || !subject) {
      return NextResponse.json(
        { error: 'Missing required query params: examId, subject' },
        { status: 400 }
      )
    }

    const messages = await ChatMessage.find({ userId, examId, subject }).sort({ createdAt: 1 })

    return NextResponse.json({ success: true, messages })

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}