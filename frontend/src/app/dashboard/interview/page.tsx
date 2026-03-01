'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Kit = { id: string; kind: string; created_at: number; job_id?: string }

type InterviewPack = {
  technical_topics?: string[]
  behavioral_questions?: string[]
  star_stories?: { title: string; situation: string; task: string; action: string; result: string }[]
  questions_to_ask?: string[]
}

export default function InterviewPage() {
  const [kits, setKits] = useState<Kit[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [company, setCompany] = useState('')
  const [pack, setPack] = useState<InterviewPack | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    api.listKits()
      .then(r => {
        const k = (r.kits || []) as Kit[]
        setKits(k.filter(x => x.job_id))
        if (k.length && k[0].job_id) setSelectedJobId(k[0].job_id!)
      })
      .catch(() => {})
    api.balance().then(r => setCredits(r.balance)).catch(() => {})
  }, [])

  async function generate() {
    if (!selectedJobId) { setError('Select a job first'); return }
    setLoading(true)
    setError('')
    setPack(null)
    try {
      const res = await api.prepareInterview(selectedJobId, { company })
      setPack(res.interview_pack as InterviewPack)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Interview Prep Coach</h1>
        <p className="text-gray-500 text-sm mt-0.5">Generate a personalised interview kit based on your job description · 3 credits</p>
      </div>

      {/* Config */}
      <div className="card p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Select job
          </label>
          {kits.length === 0 ? (
            <p className="text-gray-500 text-sm">No jobs found. <a href="/dashboard/kit/new" className="text-brand-400 hover:underline">Generate a kit first</a>.</p>
          ) : (
            <select
              className="w-full bg-surface-800 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-600/50"
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}>
              {kits.map(k => (
                <option key={k.id} value={k.job_id!}>
                  {k.kind} — {new Date(k.created_at * 1000).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Company name (optional)
          </label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Stripe, Google, startup"
            className="w-full bg-surface-800 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-600/50 placeholder-gray-600"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">Balance: {credits ?? '—'} credits</p>
          <button onClick={generate} disabled={loading || !selectedJobId}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Generating…' : 'Generate Interview Pack'}
          </button>
        </div>
      </div>

      {/* Results */}
      {pack && (
        <div className="space-y-5">
          {pack.technical_topics && pack.technical_topics.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-950/80 border border-brand-800/40 flex items-center justify-center text-brand-400 text-xs">T</span>
                Technical Topics to Study
              </h3>
              <ul className="space-y-1.5">
                {pack.technical_topics.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pack.behavioral_questions && pack.behavioral_questions.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-950/80 border border-brand-800/40 flex items-center justify-center text-brand-400 text-xs">B</span>
                Behavioral Questions
              </h3>
              <ol className="space-y-2">
                {pack.behavioral_questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="text-gray-600 font-medium shrink-0 tabular-nums">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {pack.star_stories && pack.star_stories.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-950/80 border border-brand-800/40 flex items-center justify-center text-brand-400 text-xs">S</span>
                STAR Stories
              </h3>
              <div className="space-y-5">
                {pack.star_stories.map((s, i) => (
                  <div key={i} className="border border-white/[0.06] rounded-xl p-4">
                    <p className="font-semibold text-white text-sm mb-3">{s.title}</p>
                    {[
                      ['Situation', s.situation],
                      ['Task', s.task],
                      ['Action', s.action],
                      ['Result', s.result],
                    ].map(([label, val]) => (
                      <div key={label} className="flex gap-3 mb-2">
                        <span className="text-xs font-bold text-brand-400 uppercase tracking-wider w-16 shrink-0 pt-0.5">{label}</span>
                        <span className="text-sm text-gray-400">{val}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pack.questions_to_ask && pack.questions_to_ask.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-950/80 border border-brand-800/40 flex items-center justify-center text-brand-400 text-xs">Q</span>
                Questions to Ask the Interviewer
              </h3>
              <ul className="space-y-1.5">
                {pack.questions_to_ask.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-brand-500 mt-0.5">→</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
