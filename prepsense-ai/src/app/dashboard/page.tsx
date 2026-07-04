'use client'

import { useSession, signOut } from 'next-auth/react'

export default function DashboardPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <p className="p-8">Loading...</p>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-4">
        Logged in as: {session?.user?.email}
      </p>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm"
      >
        Log out
      </button>
    </div>
  )
}
