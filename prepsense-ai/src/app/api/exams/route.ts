import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Exam from '@/models/Exam'
import User from '@/models/User'

// POST — create a new exam profile for the logged-in user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = (session.user as any).id

    await connectDB()

    const body = await req.json()
    const { name, board, stream, standard, subjects, examDate } = body

    if (!name || !board || !stream || !standard || !subjects || !examDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, board, stream, standard, subjects, examDate' },
        { status: 400 }
      )
    }

    const exam = await Exam.create({
      userId,
      name,
      board,
      stream,
      standard,
      subjects,
      examDate: new Date(examDate),
    })

    // Set this as the user's active exam
    await User.findByIdAndUpdate(userId, { activeExamId: exam._id.toString() })

    return NextResponse.json({
      success: true,
      exam,
    })

  } catch (error) {
    console.error('Exam creation error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET — list all exams for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = (session.user as any).id

    await connectDB()

    const exams = await Exam.find({ userId }).sort({ createdAt: -1 })
    const user = await User.findById(userId)

    return NextResponse.json({
      success: true,
      exams,
      activeExamId: user?.activeExamId ?? null,
    })

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
// PATCH — switch which exam is active for the logged-in user
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = (session.user as any).id

    await connectDB()

    const body = await req.json()
    const { examId } = body

    if (!examId) {
      return NextResponse.json(
        { error: 'Missing required field: examId' },
        { status: 400 }
      )
    }

    // Confirm this exam actually belongs to the logged-in user
    const exam = await Exam.findOne({ _id: examId, userId })

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found or does not belong to this user' },
        { status: 404 }
      )
    }

    await User.findByIdAndUpdate(userId, { activeExamId: examId })

    return NextResponse.json({
      success: true,
      activeExamId: examId,
      message: `Switched active exam to "${exam.name}"`,
    })

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}