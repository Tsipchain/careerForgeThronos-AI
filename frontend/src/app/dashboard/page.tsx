'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

type Kit = { id: string; kind: string; created_at: number; credits_charged: number }
type User = { email: string; full_name: string; verifyid_verified: boolean }

const QUICK_ACTIONS = [
  {
    href: '/dashboard/kit/new',
    label: 'Full career kit',
    sub: 'CV · Cover letter · Interview · Outreach',
    cost: '7 credits',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    primary: true,
  },
  {
    href: '/dashboard/kit/new',
    label: 'CV only',
    sub: 'ATS-optimized resume',
    cost: '3 credits',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/kit/new',
    label: 'ATS score',
    sub: 'Check your CV against a JD',
    cost: '1 credit',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

const KIND_LABELS: Record<string, string> = {
  full: 'Full kit',
  cv_only: 'CV only',
  ats_only: 'ATS score',
  cover_letter: 'Cover letter',
  interview: 'Interview prep',
  outreach: 'Outreach',
}

export default function DashboardHome() {
  const [balance, setBalance] = useState<number | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [kits, setKits] = useState<Kit[]>([])

  useEffect(() => {
    api.balance().then(r => setBalance(r.balance)).catch(() => {})
    api.me().then(r => setUser(r)).catch(() => {})
    api.listKits().then(r => setKits((r.kits || []) as Kit[])).catch(() => {})
  }, [])

  const firstName = user?.full_name?.split(' ')[0] || ''

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {firstName ? `Good to see you, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
        </div>
        {user?.verifyid_verified && (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-950/40 border border-green-800/40 px-3 py-1 rounded-full font-medium">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Identity verified
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Credits</p>
          <p className="text-4xl font-extrabold text-white">{balance ?? '—'}</p>
          <Link href="/dashboard/credits" className="text-brand-400 text-xs mt-2 inline-flex items-center gap-1 hover:text-brand-300 transition-colors">
            Top up
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="card p-5">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Kits generated</p>
          <p className="text-4xl font-extrabold text-white">{kits.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Credits spent</p>
          <p className="text-4xl font-extrabold text-white">
            {kits.reduce((s, k) => s + (k.credits_charged || 0), 0)}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Generate</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.label} href={a.href}
            className={`card p-5 flex flex-col gap-3 hover:border-brand-700/50 transition-all group ${a.primary ? 'border-brand-700/40 bg-brand-950/30' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${a.primary ? 'bg-brand-600/20 text-brand-400 group-hover:bg-brand-600/30' : 'bg-white/[0.04] text-gray-400 group-hover:text-white'}`}>
              {a.icon}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{a.label}</p>
              <p className="text-gray-500 text-xs">{a.sub}</p>
            </div>
            <p className={`text-xs font-medium mt-auto ${a.primary ? 'text-brand-400' : 'text-gray-600'}`}>{a.cost}</p>
          </Link>
        ))}
      </div>

      {/* Recent kits */}
      {kits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent activity</h2>
          <div className="card divide-y divide-white/[0.05]">
            {kits.slice(0, 6).map(k => (
              <div key={k.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-brand-950/60 border border-brand-800/40 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{KIND_LABELS[k.kind] || k.kind}</p>
                    <p className="text-xs text-gray-500">{new Date(k.created_at * 1000).toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-medium">{k.credits_charged} cr</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {kits.length === 0 && balance !== null && (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-950/60 border border-brand-800/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="font-semibold text-white mb-1">Generate your first kit</h3>
          <p className="text-gray-500 text-sm mb-5">Paste a job description and get a complete application kit in seconds.</p>
          <Link href="/dashboard/kit/new" className="btn-primary px-6 py-2.5 text-sm inline-block">
            Start now →
          </Link>
        </div>
      )}
    </div>
  )
}
