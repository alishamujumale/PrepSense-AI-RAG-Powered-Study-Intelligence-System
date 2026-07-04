import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import DocumentModel from '@/models/Document'
import PYQAnalysis from '@/models/PYQAnalysis'
import { parseFile } from '@/services/rag/parser'
import { analyzePYQs } from '@/services/pyq/analyser'

// POST — analyze all PYQ documents for a user+exam+subject
export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const body = await req.json()
    const { userId, examId, subject } = body

    if (!userId || !examId || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, examId, subject' },
        { status: 400 }
      )
    }

    // Find all PYQ-type documents for this user+exam+subject
    const pyqDocs = await DocumentModel.find({
      userId,
      examId,
      subject,
      type: 'pyq',
    })

    if (pyqDocs.length === 0) {
      return NextResponse.json(
        { error: 'No PYQ documents found. Upload with docType=pyq first.' },
        { status: 404 }
      )
    }

    console.log(`Found ${pyqDocs.length} PYQ documents to analyze`)

    // Combine text from all PYQ documents
    let combinedText = ''
    for (const doc of pyqDocs) {
      const parsed = await parseFile(doc.filePath)
      combinedText += parsed.text + '\n\n'
    }

    console.log(`Combined text length: ${combinedText.length} chars`)

    // Run the analysis pipeline
    const result = await analyzePYQs(combinedText, subject)

    // Save/update analysis in MongoDB
    const analysis = await PYQAnalysis.findOneAndUpdate(
      { userId, examId, subject },
      {
        userId,
        examId,
        subject,
        totalQuestions: result.totalQuestions,
        topicRanking:   result.topicRanking,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success:        true,
      subject,
      documentsAnalyzed: pyqDocs.length,
      totalQuestions: analysis.totalQuestions,
      topicRanking:   analysis.topicRanking,
    })

  } catch (error) {
    console.error('PYQ analysis error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET — retrieve saved analysis (no re-computation)
export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const userId  = searchParams.get('userId')
    const examId  = searchParams.get('examId')
    const subject = searchParams.get('subject')

    if (!userId || !examId || !subject) {
      return NextResponse.json(
        { error: 'Missing required query params: userId, examId, subject' },
        { status: 400 }
      )
    }

    const analysis = await PYQAnalysis.findOne({ userId, examId, subject })

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found. Run POST /api/pyq first.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success:        true,
      subject,
      totalQuestions: analysis.totalQuestions,
      topicRanking:   analysis.topicRanking,
      analyzedAt:     analysis.analyzedAt,
    })

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}