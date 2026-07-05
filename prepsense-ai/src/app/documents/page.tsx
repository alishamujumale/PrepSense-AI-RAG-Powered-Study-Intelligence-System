'use client'

import { useState, useEffect } from 'react'
import AppNav from '@/components/AppNav'

interface DocItem {
  _id: string
  originalName: string
  subject: string
  type: 'notes' | 'pyq' | 'syllabus'
  examId: string
  chunkCount: number
  isProcessed: boolean
  createdAt: string
}

const TYPE_BADGE: Record<DocItem['type'], string> = {
  notes:    'bg-blue-50 text-blue-700 border-blue-200',
  pyq:      'bg-amber-50 text-amber-700 border-amber-200',
  syllabus: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/documents')
    const data = await res.json()
    if (data.success) setDocs(data.documents)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This removes it and its indexed content permanently.')) return
    setDeletingId(id)
    const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setDocs(prev => prev.filter(d => d._id !== id))
    } else {
      alert(data.error || 'Failed to delete')
    }
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <AppNav />
        <div className="flex items-center justify-between mb-6 mt-6">
          <h1 className="text-2xl font-semibold text-[#1E1B4B]">Your documents</h1>
          <a href="/upload" className="rounded-full bg-[#4338CA] text-white px-4 py-2 text-sm font-medium">
            + Upload
          </a>
        </div>

        {loading ? (
          <p className="text-sm text-[#8A8FA3]">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-[#E4E7F5] bg-white p-8 text-center">
            <p className="text-sm text-[#4B5060] mb-3">No documents uploaded yet.</p>
            <a href="/upload" className="text-sm font-medium text-[#4338CA] underline">Upload your first file</a>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc._id} className="flex items-center justify-between rounded-xl border border-[#E4E7F5] bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1E1B4B] truncate">{doc.originalName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TYPE_BADGE[doc.type]}`}>
                      {doc.type}
                    </span>
                    <span className="text-xs text-[#8A8FA3]">{doc.subject}</span>
                    <span className="text-xs text-[#8A8FA3]">·</span>
                    <span className="text-xs text-[#8A8FA3] font-mono">{doc.chunkCount} chunks</span>
                    {!doc.isProcessed && (
                      <span className="text-xs text-amber-600">· processing failed</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc._id)}
                  disabled={deletingId === doc._id}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 ml-4"
                >
                  {deletingId === doc._id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}