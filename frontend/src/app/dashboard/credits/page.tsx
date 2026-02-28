'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const PACKS = [
  { key: 'pack_30',  credits: 30,  price: '€9',  label: 'Starter', desc: '~4 full career kits' },
  { key: 'pack_100', credits: 100, price: '€24', label: 'Pro',     desc: '~14 full career kits', popular: true },
  { key: 'pack_300', credits: 300, price: '€59', label: 'Power',   desc: '~42 full career kits' },
]

const COSTS = [
  { action: 'Full kit (CV + cover letter + interview + outreach)', credits: 7 },
  { action: 'CV only',               credits: 3 },
  { action: 'Cover letter only',      credits: 2 },
  { action: 'ATS score analysis',     credits: 1 },
  { action: 'AI chat assistant',      credits: 10 },
]

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    api.balance().then(r => setBalance(r.balance)).catch(() => {})
  }, [])

  async function buy(pack: string) {
    setLoading(pack)
    try {
      const { checkout_url } = await api.checkout(pack)
      window.location.href = checkout_url
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Payment error')
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Balance */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-5">Credits</h1>
        <div className="card p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-950/60 border border-brand-800/40 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Current balance</p>
            <p className="text-5xl font-extrabold text-white leading-none mt-0.5">
              {balance ?? '—'}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">credits</p>
          </div>
        </div>
      </div>

      {/* Packs */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Top up</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {PACKS.map(p => (
          <div key={p.key}
            className={`card p-5 flex flex-col transition-all ${p.popular ? 'border-brand-600/50 ring-1 ring-brand-600/20 bg-brand-950/20' : 'hover:border-white/10'}`}>
            {p.popular && (
              <span className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">Most popular</span>
            )}
            <p className="text-gray-400 text-sm font-medium">{p.label}</p>
            <p className="text-3xl font-extrabold text-white mt-1">{p.price}</p>
            <p className="text-brand-300 font-semibold mt-0.5">{p.credits} credits</p>
            <p className="text-gray-500 text-xs mt-1 mb-5">{p.desc}</p>
            <button
              onClick={() => buy(p.key)}
              disabled={loading === p.key}
              className={`mt-auto py-2.5 rounded-xl text-sm font-semibold transition-all ${
                p.popular ? 'btn-primary' : 'btn-ghost'
              }`}>
              {loading === p.key
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Redirecting…
                  </span>
                : `Buy for ${p.price}`
              }
            </button>
          </div>
        ))}
      </div>

      {/* Cost table */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Cost per action</h2>
      <div className="card divide-y divide-white/[0.05]">
        {COSTS.map(c => (
          <div key={c.action} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-gray-400 text-sm">{c.action}</span>
            <span className="text-white font-semibold text-sm tabular-nums">{c.credits} cr</span>
          </div>
        ))}
      </div>

      <p className="text-gray-600 text-xs mt-4 text-center">
        Payments processed securely via Stripe. Credits never expire.
      </p>
    </div>
  )
}
