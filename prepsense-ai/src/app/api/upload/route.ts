import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import DocumentModel from '@/models/Document'
import Exam from '@/models/Exam'
import { parseFile } from '@/services/rag/parser'
import { chunkText } from '@/services/rag/chunker'
import { embedChunks } from '@/services/rag/embedder'
import { storeChunks } from '@/services/rag/retriever'
import { getCollection } from '@/lib/chromadb'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userIdStr = (session.user as any).id

    await connectDB()

    const formData = await req.formData()

    const file    = formData.get('file')
    const examId  = formData.get('examId')
    const subject = formData.get('subject')
    const docType = formData.get('docType')

    if (!file || !examId || !subject || !docType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, examId, subject, docType' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'file field must be a File' },
        { status: 400 }
      )
    }

    const examIdStr  = examId.toString()
    const subjectStr = subject.toString()
    const docTypeStr = docType.toString()

    if (!['notes', 'pyq', 'syllabus'].includes(docTypeStr)) {
      return NextResponse.json(
        { error: 'docType must be: notes, pyq, or syllabus' },
        { status: 400 }
      )
    }

    // Confirm this exam actually belongs to the logged-in user
    const exam = await Exam.findOne({ _id: examIdStr, userId: userIdStr })
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found or does not belong to this user' },
        { status: 403 }
      )
    }

    // Save file to disk
    const uploadDir = path.join(process.cwd(), 'uploads', userIdStr, examIdStr)
    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const filePath = path.join(uploadDir, fileName)

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    console.log(`✓ File saved: ${filePath}`)

    const { collectionName } = await getCollection(userIdStr, examIdStr, subjectStr)

    const doc = await DocumentModel.create({
      userId:           userIdStr,
      examId:           examIdStr,
      subject:          subjectStr,
      type: docTypeStr as 'notes' | 'pyq' | 'syllabus',
      originalName:     file.name,
      filePath,
      chromaCollection: collectionName,
      chunkCount:       0,
      isProcessed:      false,
    })

    console.log('Starting RAG pipeline...')

    const parsed = await parseFile(filePath)
    console.log(`✓ Parsed: ${parsed.pageCount} pages, ${parsed.text.length} chars`)

    const chunks = chunkText(parsed.text)
    console.log(`✓ Chunked: ${chunks.length} chunks`)

    const embedded = await embedChunks(chunks)
    console.log(`✓ Embedded: ${embedded.length} chunks`)

    await storeChunks(embedded, {
      userId:  userIdStr,
      examId:  examIdStr,
      subject: subjectStr,
      docId: doc._id.toString(),
      docType: docTypeStr as 'notes' | 'pyq' | 'syllabus',
    })

    await DocumentModel.findByIdAndUpdate(doc._id, {
      chunkCount:  embedded.length,
      isProcessed: true,
    })

    return NextResponse.json({
      success:    true,
      documentId: doc._id,
      fileName:   file.name,
      pages:      parsed.pageCount,
      chunks:     embedded.length,
      collection: collectionName,
      message:    `Successfully processed ${embedded.length} chunks from ${file.name}`,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}