'use client'

import { useState, useEffect, useRef } from 'react'
import AppNav from '@/components/AppNav'

type Format = '2mark' | '5mark' | '10mark' | 'explain'

interface Exam {
  _id: string
  name: string
  subjects: string[]
}

interface Message {
  _id?: string
  role: 'user' | 'assistant'
  content: string
  mode?: 'rag' | 'curriculum'
  chunksUsed?: number
  pending?: boolean
}

const FORMAT_LABELS: Record<Format, string> = {
  explain: 'Explain',
  '2mark': '2 Marks',
  '5mark': '5 Marks',
  '10mark': '10 Marks',
}

export default function ChatPage() {
  const [exam, setExam] = useState<Exam | null>(null)
  const [subject, setSubject] = useState('')
  const [format, setFormat] = useState<Format>('explain')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

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
  }, [])

  useEffect(() => {
    if (!exam || !subject) return
    setLoadingHistory(true)
    fetch(`/api/chat?examId=${exam._id}&subject=${encodeURIComponent(subject)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setMessages(d.messages)
      })
      .finally(() => setLoadingHistory(false))
  }, [exam, subject])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !exam || !subject || loading) return

    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setMessages(prev => [...prev, { role: 'assistant', content: '', pending: true }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, examId: exam._id, subject, format }),
      })
      const data = await res.json()

      setMessages(prev => {
        const withoutPending = prev.filter(m => !m.pending)
        if (!res.ok) {
          return [...withoutPending, { role: 'assistant', content: `Error: ${data.error}` }]
        }
        return [...withoutPending, {
          role: 'assistant',
          content: data.answer,
          mode: data.mode,
          chunksUsed: data.chunksUsed,
        }]
      })
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.pending),
        { role: 'assistant', content: 'Network error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FC]">
      <AppNav />
      {/* Top bar */}
      <div className="border-b border-[#E4E7F5] bg-white px-6 py-3 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-[#1E1B4B] mr-auto">
          {exam ? exam.name : 'Chat'}
        </p>

        {exam && (
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="rounded-full border border-[#E4E7F5] bg-white px-3 py-1.5 text-sm text-[#1E1B4B]"
          >
            {exam.subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <div className="flex rounded-full border border-[#E4E7F5] bg-[#F7F8FC] p-1">
          {(Object.keys(FORMAT_LABELS) as Format[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                format === f ? 'bg-[#4338CA] text-white' : 'text-[#4B5060] hover:bg-white'
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {!exam ? (
            <div className="rounded-2xl border border-[#E4E7F5] bg-white p-8 text-center">
              <p className="text-sm text-[#4B5060]">
                You need an exam profile before you can chat. Set one up first.
              </p>
              <a href="/dashboard" className="mt-3 inline-block text-sm font-medium text-[#4338CA] underline">
                Go to dashboard
              </a>
            </div>
          ) : loadingHistory ? (
            <p className="text-sm text-[#8A8FA3] text-center">Loading conversation…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-[#8A8FA3] text-center">
              Ask a question about {subject} to get started.
            </p>
          ) : (
            messages.map((m, i) => <MessageBubble key={m._id ?? i} message={m} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {exam && (
        <div className="border-t border-[#E4E7F5] bg-white px-6 py-4">
          <div className="mx-auto max-w-2xl flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`Ask about ${subject}...`}
              className="flex-1 rounded-full border border-[#E4E7F5] px-4 py-2.5 text-sm outline-none focus:border-[#4338CA]"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-full bg-[#4338CA] text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-[#4338CA] text-white'
          : 'bg-white border border-[#E4E7F5] text-[#1E1B4B]'
      }`}>
        {message.pending ? (
          <span className="text-sm text-[#8A8FA3]">Thinking…</span>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {!isUser && message.mode && (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  message.mode === 'rag'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {message.mode === 'rag' ? 'From your notes' : 'General knowledge'}
                </span>
                {message.mode === 'rag' && message.chunksUsed !== undefined && (
                  <span className="text-[10px] text-[#8A8FA3]">
                    {message.chunksUsed} excerpt{message.chunksUsed !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}