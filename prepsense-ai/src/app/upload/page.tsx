'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Fraunces } from 'next/font/google'
import AppNav from '@/components/AppNav'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
})

type DocType = 'notes' | 'pyq' | 'syllabus'

interface Exam {
  _id: string
  name: string
  subjects: string[]
}

interface UploadItem {
  id: string
  file: File
  docType: DocType
  status: 'queued' | 'parsing' | 'chunking' | 'embedding' | 'storing' | 'done' | 'error'
  error?: string
  result?: { chunks: number; pages: number }
}

const DOC_TYPE_META: Record<DocType, { label: string; badge: string }> = {
  notes:    { label: 'Notes',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  pyq:      { label: 'PYQ',      badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  syllabus: { label: 'Syllabus', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const PIPELINE_STEPS: { key: UploadItem['status']; label: string }[] = [
  { key: 'parsing',   label: 'Parse' },
  { key: 'chunking',  label: 'Chunk' },
  { key: 'embedding', label: 'Embed' },
  { key: 'storing',   label: 'Store' },
]

export default function UploadPage() {
  const [exam, setExam] = useState<Exam | null>(null)
  const [loadingExam, setLoadingExam] = useState(true)
  const [subject, setSubject] = useState('')
  const [docType, setDocType] = useState<DocType>('notes')
  const [dragActive, setDragActive] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/exams')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.exams?.length) {
          const active = d.exams.find((e: Exam) => e._id === d.activeExamId) ?? d.exams[0]
          setExam(active)
          setSubject(active.subjects?.[0] ?? '')
        }
      })
      .finally(() => setLoadingExam(false))
  }, [])

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf')
    const newItems: UploadItem[] = pdfFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      docType,
      status: 'queued',
    }))
    setItems(prev => [...newItems, ...prev])
  }, [docType])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  async function processUpload(item: UploadItem) {
    if (!exam || !subject) return

    const advance = (status: UploadItem['status']) =>
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i))

    advance('parsing')
    const form = new FormData()
    form.append('file', item.file)
    form.append('examId', exam._id)
    form.append('subject', subject)
    form.append('docType', item.docType)

    // The API doesn't stream real progress yet, so the stepper advances on
    // a timer while the actual request runs in the background.
    const timers = [
      setTimeout(() => advance('chunking'), 900),
      setTimeout(() => advance('embedding'), 1800),
      setTimeout(() => advance('storing'), 2700),
    ]

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      timers.forEach(clearTimeout)

      if (!res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: data.error } : i))
        return
      }

      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: 'done', result: { chunks: data.chunks, pages: data.pages } }
        : i))
    } catch {
      timers.forEach(clearTimeout)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Network error' } : i))
    }
  }

  useEffect(() => {
    const next = items.find(i => i.status === 'queued')
    if (next) processUpload(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return (
    <div className={`${fraunces.variable} min-h-screen bg-gradient-to-b from-[#EEF0FF] via-[#F7F8FC] to-[#F7F8FC] px-6 py-12`}>
      <AppNav />
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium tracking-wide text-[#6D28D9] uppercase mb-2">
          {exam ? exam.name : 'Study material'}
        </p>
        <h1 style={{ fontFamily: 'var(--font-fraunces)' }} className="text-3xl font-semibold text-[#1E1B4B] mb-2">
          Upload your study material
        </h1>
        <p className="text-sm text-[#4B5060] mb-8">
          Notes, past papers, or syllabus documents — PrepSense reads and indexes them for your next question.
        </p>

        {loadingExam ? (
          <div className="rounded-2xl border border-[#E4E7F5] bg-white p-8 text-sm text-[#6B7280]">
            Loading your exam profile…
          </div>
        ) : !exam ? (
          <div className="rounded-2xl border border-[#E4E7F5] bg-white p-8">
            <p className="text-sm text-[#4B5060]">
              You don't have an exam profile yet. Set one up before uploading material.
            </p>
            <a href="/dashboard" className="mt-3 inline-block text-sm font-medium text-[#4338CA] underline">
              Go to dashboard
            </a>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex rounded-full border border-[#E4E7F5] bg-white p-1">
                {(Object.keys(DOC_TYPE_META) as DocType[]).map(dt => (
                  <button
                    key={dt}
                    onClick={() => setDocType(dt)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                      docType === dt
                        ? 'bg-[#4338CA] text-white shadow-sm'
                        : 'text-[#4B5060] hover:bg-[#F2F1FB]'
                    }`}
                  >
                    {DOC_TYPE_META[dt].label}
                  </button>
                ))}
              </div>

              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="rounded-full border border-[#E4E7F5] bg-white px-4 py-1.5 text-sm text-[#1E1B4B]"
              >
                {exam.subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition
                ${dragActive
                  ? 'border-[#4338CA] bg-[#EEF0FF]'
                  : 'border-[#D8DCF0] bg-white hover:border-[#B9C0EA]'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={e => e.target.files && addFiles(e.target.files)}
              />
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#4338CA] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-[#1E1B4B]">
                Drop PDFs here, or click to browse
              </p>
              <p className="text-xs text-[#8A8FA3] mt-1">
                Tagged as <span className="font-medium">{DOC_TYPE_META[docType].label}</span> · {subject || 'no subject selected'}
              </p>
            </div>

            {items.length > 0 && (
              <div className="mt-8 space-y-3">
                {items.map(item => (
                  <UploadCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function UploadCard({ item }: { item: UploadItem }) {
  const meta = DOC_TYPE_META[item.docType]
  const currentStepIndex = PIPELINE_STEPS.findIndex(s => s.key === item.status)

  return (
    <div className="rounded-xl border border-[#E4E7F5] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1E1B4B] truncate">{item.file.name}</p>
          <p className="text-xs text-[#8A8FA3] font-mono">{(item.file.size / 1024).toFixed(0)} KB</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      {item.status === 'error' ? (
        <p className="text-sm text-red-600">{item.error ?? 'Something went wrong'}</p>
      ) : item.status === 'done' ? (
        <p className="text-sm text-emerald-600">
          Indexed · {item.result?.pages} pages · {item.result?.chunks} chunks
        </p>
      ) : (
        <div className="flex items-center gap-2">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.key} className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStepIndex ? 'bg-gradient-to-r from-[#6D28D9] to-[#4338CA]' : 'bg-[#EDEEF7]'
            }`} />
          ))}
          <span className="text-xs text-[#8A8FA3] whitespace-nowrap ml-1">
            {PIPELINE_STEPS[currentStepIndex]?.label ?? 'Queued'}…
          </span>
        </div>
      )}
    </div>
  )
}