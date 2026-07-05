import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import DocumentModel from '@/models/Document'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()

    const userId = (session.user as any).id
    const docs = await DocumentModel.find({ userId }).sort({ createdAt: -1 }).lean()

    const serializedDocs = docs.map(doc => ({
      _id: doc._id.toString(),
      userId: doc.userId,
      examId: doc.examId,
      subject: doc.subject,
      type: doc.type,
      originalName: doc.originalName,
      chunkCount: doc.chunkCount,
      isProcessed: doc.isProcessed,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    }))

    return NextResponse.json({ success: true, documents: serializedDocs })
  } catch (error) {
    console.error('Documents GET error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Document id is required' }, { status: 400 })
    }

    await connectDB()

    const userId = (session.user as any).id
    const doc = await DocumentModel.findOneAndDelete({ _id: id, userId })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Documents DELETE error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
