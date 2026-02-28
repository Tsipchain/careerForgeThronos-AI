'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

type KitResult = {
  kit_id: string
  credits_charged: number
  artifacts: {
    cv?: { summary: string; bullets: string[] }
    cover_letter?: string
    outreach_pack?: Record<string, string>
    interview_pack?: { technical_topics: string[]; behavioral_questions: string[] }
  }
}

export default function NewKitPage() {
  const [jobText, setJobText] = useState('')
  const [cvText, setCvText] = useState('')
  const [kind, setKind] = useState<'full' | 'cv_only' | 'ats_only'>('full')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [result, setResult] = useState<KitResult | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    if (!jobText.trim()) { setError('Paste a job description first'); return }
    setError('')
    setLoading(true)
    try {
      // 1. Parse job
      const jobRes = await api.parseJob(jobText)
      // 2. Build profile from CV text if provided
      const profile = cvText.trim() ? { raw_cv: cvText } : {}
      // 3. Generate kit
      const kit = await api.generateKit({ job_id: jobRes.job_id, profile, kind })
      setResult(kit as KitResult)
      setStep('result')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'result' && result) return <KitResults result={result} onBack={() => { setStep('input'); setResult(null) }} />

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Generate a Career Kit</h1>
      <p className="text-gray-400 mb-8">Paste a job description and optionally your existing CV to generate a tailored application kit.</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Kit type</label>
          <div className="flex gap-3">
            {([['full', 'Full kit (7 credits)', ], ['cv_only', 'CV only (3 credits)'], ['ats_only', 'ATS score (1 credit)']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setKind(k as typeof kind)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${kind === k ? 'border-brand-500 bg-brand-900/30 text-brand-300' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Job description *</label>
          <textarea value={jobText} onChange={e => setJobText(e.target.value)} rows={10}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500 resize-none"
            placeholder="Paste the full job description here…" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Your CV / experience <span className="text-gray-500">(optional — improves results)</span></label>
          <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={6}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500 resize-none"
            placeholder="Paste your current CV or list your experience here…" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={generate} disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
          {loading ? 'Generating…' : 'Generate kit'}
        </button>
      </div>
    </div>
  )
}

function KitResults({ result, onBack }: { result: KitResult; onBack: () => void }) {
  const [tab, setTab] = useState(0)
  const a = result.artifacts || {}
  const tabs = [
    a.cv && { label: 'CV', content: <CVView cv={a.cv} /> },
    a.cover_letter && { label: 'Cover Letter', content: <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{a.cover_letter}</pre> },
    a.interview_pack && { label: 'Interview Prep', content: <InterviewView pack={a.interview_pack} /> },
    a.outreach_pack && { label: 'Outreach', content: <OutreachView pack={a.outreach_pack} /> },
  ].filter(Boolean) as { label: string; content: React.ReactNode }[]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <h1 className="text-2xl font-bold">Your Career Kit</h1>
        <span className="ml-auto text-xs text-gray-500">{result.credits_charged} credits used</span>
      </div>
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className={`px-4 py-1.5 rounded-t text-sm font-medium transition-colors ${tab === i ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">{tabs[tab]?.content}</div>
    </div>
  )
}

function CVView({ cv }: { cv: { summary: string; bullets: string[]; ats_notes?: string[] } }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Summary</h3>
        <p className="text-gray-200 leading-relaxed">{cv.summary}</p>
      </div>
      {cv.bullets?.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Key achievements</h3>
          <ul className="space-y-1.5">
            {cv.bullets.map((b, i) => <li key={i} className="text-gray-300 text-sm flex gap-2"><span className="text-brand-400 mt-0.5">•</span>{b}</li>)}
          </ul>
        </div>
      )}
      {cv.ats_notes && cv.ats_notes.length > 0 && (
        <div className="bg-brand-900/20 border border-brand-700/30 rounded-lg p-4">
          <h3 className="text-xs text-brand-400 uppercase tracking-wider mb-2">ATS tips</h3>
          <ul className="space-y-1">
            {cv.ats_notes.map((n, i) => <li key={i} className="text-brand-200 text-sm">• {n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function InterviewView({ pack }: { pack: { technical_topics?: string[]; behavioral_questions?: string[] } }) {
  return (
    <div className="space-y-5">
      {pack.technical_topics && pack.technical_topics.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Technical topics to study</h3>
          <div className="flex flex-wrap gap-2">{pack.technical_topics.map(t => <span key={t} className="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300">{t}</span>)}</div>
        </div>
      )}
      {pack.behavioral_questions && pack.behavioral_questions.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Behavioral questions</h3>
          <ul className="space-y-2">{pack.behavioral_questions.map((q, i) => <li key={i} className="text-gray-300 text-sm bg-gray-800 rounded-lg px-4 py-2">{q}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

function OutreachView({ pack }: { pack: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {Object.entries(pack).map(([key, msg]) => (
        <div key={key} className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2 uppercase">{key.replace(/_/g, ' ')}</p>
          <pre className="whitespace-pre-wrap text-sm text-gray-300">{msg}</pre>
        </div>
      ))}
    </div>
  )
}
