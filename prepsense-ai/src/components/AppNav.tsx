'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/chat', label: 'Chat' },
  { href: '/documents', label: 'Documents' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-[#E4E7F5] bg-white px-6 py-3 flex items-center gap-1">
      <span className="text-sm font-semibold text-[#1E1B4B] mr-4">PrepSense AI</span>

      {LINKS.map(link => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm px-3 py-1.5 rounded-full transition ${
              active
                ? 'bg-[#EEF0FF] text-[#4338CA] font-medium'
                : 'text-[#6B7280] hover:bg-[#F7F8FC]'
            }`}
          >
            {link.label}
          </Link>
        )
      })}

      <button
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className="ml-auto text-sm text-[#6B7280] hover:text-[#1E1B4B]"
      >
        Log out
      </button>
    </div>
  )
}