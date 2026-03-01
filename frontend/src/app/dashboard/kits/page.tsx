'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

type Kit = {
  id: string
  kind: string
  created_at: number
  credits_charged: number
}

const KIND_META: Record<string, { label: string; label_el: string; color: string; icon: React.ReactNode }> = {
  full: {
    label: 'Full Kit',
    label_el: 'Πλήρες Kit',
    color: 'text-brand-400 bg-brand-950/60 border-brand-800/40',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  cv_only: {
    label: 'CV Only',
    label_el: 'Μόνο CV',
    color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  ats_only: {
    label: 'ATS Score',
    label_el: 'ATS Score',
    color: 'text-yellow-400 bg-yellow-950/60 border-yellow-800/40',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
}

const FALLBACK: typeof KIND_META['full'] = {
  label: 'Kit',
  label_el: 'Kit',
  color: 'text-gray-400 bg-white/[0.04] border-white/[0.08]',
  icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
}

const FILTERS = [
  { id: 'all', label: 'All', label_el: 'Όλα' },
  { id: 'full', label: 'Full Kit', label_el: 'Πλήρες Kit' },
  { id: 'cv_only', label: 'CV Only', label_el: 'Μόνο CV' },
  { id: 'ats_only', label: 'ATS Score', label_el: 'ATS Score' },
]

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  // detect lang from localStorage for labels (no context needed since layout handles it)
  const [lang, setLang] = useState<'en' | 'el'>('en')

  useEffect(() => {
    const saved = localStorage.getItem('cf_lang')
    if (saved === 'el') setLang('el')
    api.listKits()
      .then(r => setKits((r.kits || []) as Kit[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === 'all' ? kits : kits.filter(k => k.kind === filter)
  const totalCredits = kits.reduce((s, k) => s + (k.credits_charged || 0), 0)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {lang === 'el' ? 'Τα Kits μου' : 'My Kits'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {lang === 'el'
              ? `${kits.length} kit${kits.length !== 1 ? 's' : ''} · ${totalCredits} credits συνολικά`
              : `${kits.length} kit${kits.length !== 1 ? 's' : ''} · ${totalCredits} credits total`}
          </p>
        </div>
        <Link href="/dashboard/kit/new" className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {lang === 'el' ? 'Νέο Kit' : 'New Kit'}
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-surface-800 border border-white/[0.06] p-1 rounded-xl w-fit">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-gray-400 hover:text-white'
            }`}>
            {lang === 'el' ? f.label_el : f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card p-10 text-center">
          <svg className="animate-spin w-6 h-6 text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-950/60 border border-brand-800/40 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="font-semibold text-white mb-1">
            {lang === 'el' ? 'Δεν βρέθηκαν kits' : 'No kits found'}
          </h3>
          <p className="text-gray-500 text-sm mb-5">
            {lang === 'el'
              ? 'Δημιούργησε το πρώτο σου kit επικολλώντας μια αγγελία εργασίας.'
              : 'Generate your first kit by pasting a job description.'}
          </p>
          <Link href="/dashboard/kit/new" className="btn-primary px-6 py-2.5 text-sm inline-block">
            {lang === 'el' ? 'Ξεκίνα τώρα →' : 'Start now →'}
          </Link>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="card divide-y divide-white/[0.05]">
          {visible.map(k => {
            const meta = KIND_META[k.kind] || FALLBACK
            const label = lang === 'el' ? meta.label_el : meta.label
            const date = new Date(k.created_at * 1000)
            const dateStr = date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })
            const timeStr = date.toLocaleTimeString(lang === 'el' ? 'el-GR' : 'en-GB', {
              hour: '2-digit', minute: '2-digit',
            })

            return (
              <div key={k.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{dateStr} · {timeStr}</p>
                </div>

                {/* Credits */}
                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-500 font-medium bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                    {k.credits_charged} cr
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && kits.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: lang === 'el' ? 'Συνολικά Kits' : 'Total Kits', value: kits.length },
            { label: lang === 'el' ? 'Credits Χρησιμοποιήθηκαν' : 'Credits Used', value: totalCredits },
            {
              label: lang === 'el' ? 'Αυτόν τον Μήνα' : 'This Month',
              value: kits.filter(k => {
                const d = new Date(k.created_at * 1000)
                const now = new Date()
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
              }).length,
            },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
