'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    router.replace(session ? '/dashboard' : '/auth/login')
  }, [session, status, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[#8A8FA3]">Loading…</p>
    </div>
  )
}