'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import AppNav from '@/components/AppNav'

interface Exam {
  _id: string
  name: string
  board: string
  stream: string
  standard: string
  subjects: string[]
  examDate: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [exams, setExams] = useState<Exam[]>([])
  const [activeExamId, setActiveExamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  async function loadExams() {
    setLoading(true)
    const res = await fetch('/api/exams')
    const data = await res.json()
    if (data.success) {
      setExams(data.exams)
      setActiveExamId(data.activeExamId)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadExams()
  }, [])

  async function switchExam(examId: string) {
    setSwitching(examId)
    const res = await fetch('/api/exams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId }),
    })
    const data = await res.json()
    if (data.success) setActiveExamId(examId)
    setSwitching(null)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] px-6 py-10">
      <AppNav />
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-wide text-[#6D28D9] uppercase mb-1">
            PrepSense AI
          </p>
          <h1 className="text-2xl font-semibold text-[#1E1B4B]">
            {session?.user?.name ? `Hi, ${session.user.name}` : 'Dashboard'}
          </h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[#1E1B4B]">Your exams</h2>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-[#4338CA] text-white px-4 py-2 text-sm font-medium"
          >
            + New exam
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#8A8FA3]">Loading your exams…</p>
        ) : exams.length === 0 ? (
          <div className="rounded-2xl border border-[#E4E7F5] bg-white p-8 text-center">
            <p className="text-sm text-[#4B5060] mb-3">
              You haven't set up an exam yet. Create one to start uploading notes and chatting.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-[#4338CA] text-white px-4 py-2 text-sm font-medium"
            >
              Create your first exam
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {exams.map(exam => (
              <ExamCard
                key={exam._id}
                exam={exam}
                isActive={exam._id === activeExamId}
                switching={switching === exam._id}
                onSwitch={() => switchExam(exam._id)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <NewExamModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); loadExams() }}
        />
      )}
    </div>
  )
}

function ExamCard({
  exam, isActive, switching, onSwitch,
}: {
  exam: Exam
  isActive: boolean
  switching: boolean
  onSwitch: () => void
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 ${
      isActive ? 'border-[#4338CA] ring-1 ring-[#4338CA]' : 'border-[#E4E7F5]'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-[#1E1B4B]">{exam.name}</h3>
        {isActive && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EEF0FF] text-[#4338CA]">
            Active
          </span>
        )}
      </div>
      <p className="text-xs text-[#8A8FA3] mb-3">
        {exam.board} · {exam.stream} · Std {exam.standard}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {exam.subjects.map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F8FC] text-[#4B5060] border border-[#E4E7F5]">
            {s}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={onSwitch}
            disabled={switching}
            className="text-xs font-medium text-[#4338CA] hover:underline disabled:opacity-50"
          >
            {switching ? 'Switching…' : 'Set active'}
          </button>
        )}
        {isActive && (
          <>
            <a href="/upload" className="text-xs font-medium text-[#4338CA] hover:underline">Upload notes</a>
            <span className="text-[#D8DCF0]">·</span>
            <a href="/chat" className="text-xs font-medium text-[#4338CA] hover:underline">Open chat</a>
          </>
        )}
      </div>
    </div>
  )
}

function NewExamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [board, setBoard] = useState('')
  const [stream, setStream] = useState('')
  const [standard, setStandard] = useState('')
  const [subjectsInput, setSubjectsInput] = useState('')
  const [examDate, setExamDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const subjects = subjectsInput.split(',').map(s => s.trim()).filter(Boolean)
    if (subjects.length === 0) {
      setError('Add at least one subject')
      return
    }

    setSaving(true)
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, board, stream, standard, subjects, examDate }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create exam')
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold text-[#1E1B4B] mb-4">Create exam profile</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required placeholder="Exam name (e.g. HSC Boards 2027)"
            value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-[#E4E7F5] px-3 py-2 text-sm"
          />
          <input
            required placeholder="Board (e.g. CBSE, Maharashtra State Board)"
            value={board} onChange={e => setBoard(e.target.value)}
            className="w-full rounded-lg border border-[#E4E7F5] px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <input
              required placeholder="Stream (e.g. Science)"
              value={stream} onChange={e => setStream(e.target.value)}
              className="flex-1 rounded-lg border border-[#E4E7F5] px-3 py-2 text-sm"
            />
            <input
              required placeholder="Standard (e.g. 12)"
              value={standard} onChange={e => setStandard(e.target.value)}
              className="w-28 rounded-lg border border-[#E4E7F5] px-3 py-2 text-sm"
            />
          </div>
          <input
            required placeholder="Subjects, comma separated"
            value={subjectsInput} onChange={e => setSubjectsInput(e.target.value)}
            className="w-full rounded-lg border border-[#E4E7F5] px-3 py-2 text-sm"
          />
          <input
            required type="date"
            value={examDate} onChange={e => setExamDate(e.target.value)}
            className="w-full rounded-lg border border-[#E4E7F5] px-3 py-2 text-sm"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-full border border-[#E4E7F5] py-2 text-sm font-medium text-[#4B5060]"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 rounded-full bg-[#4338CA] text-white py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}