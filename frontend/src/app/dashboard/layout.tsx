'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { isLoggedIn, clearToken } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/login')
  }, [router])

  function logout() {
    clearToken()
    router.push('/')
  }

  const nav = [
    { href: '/dashboard', label: 'Home' },
    { href: '/dashboard/kit/new', label: 'New Kit' },
    { href: '/dashboard/profile', label: 'Profile' },
    { href: '/dashboard/credits', label: 'Credits' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-800">
          <Link href="/" className="text-lg font-bold text-brand-500">CareerForge</Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(n => (
            <Link key={n.href} href={n.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                path === n.href ? 'bg-brand-900/50 text-brand-300' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="mx-3 mb-4 px-3 py-2 text-sm text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 text-left transition-colors">
          Sign out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
