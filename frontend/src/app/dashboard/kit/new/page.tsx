'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

type KitKind = 'full' | 'cv_only' | 'ats_only'

type KitResult = {
  kit_id: string
  credits_charged: number
  artifacts: {
    cv?: { summary: string; bullets: string[]; ats_notes?: string[] }
    cover_letter?: string
    outreach_pack?: Record<string, string>
    interview_pack?: { technical_topics?: string[]; behavioral_questions?: string[] }
    ats_score?: number
    missing_keywords?: string[]
    recommendations?: string[]
  }
}

const KINDS: { id: KitKind; label: string; sub: string; cost: string }[] = [
  { id: 'full',     label: 'Full kit',   sub: 'CV · Cover letter · Interview prep · Outreach', cost: '7 credits' },
  { id: 'cv_only',  label: 'CV only',    sub: 'ATS-optimized resume tailored to the role',      cost: '3 credits' },
  { id: 'ats_only', label: 'ATS score',  sub: 'Keyword matching score + recommendations',        cost: '1 credit'  },
]

// ── Result tabs ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
      {copied
        ? <><svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied</>
        : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copy</>
      }
    </button>
  )
}

function CVView({ cv }: { cv: NonNullable<KitResult['artifacts']['cv']> }) {
  const text = [cv.summary, ...(cv.bullets || [])].join('\n')
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Professional summary</h3>
        <CopyBtn text={text} />
      </div>
      <p className="text-gray-200 leading-relaxed text-sm">{cv.summary}</p>
      {cv.bullets?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Key achievements</h3>
          <ul className="space-y-2">
            {cv.bullets.map((b, i) => (
              <li key={i} className="text-gray-300 text-sm flex gap-2.5">
                <span className="text-brand-400 shrink-0 mt-0.5">▸</span>{b}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cv.ats_notes && cv.ats_notes.length > 0 && (
        <div className="bg-brand-950/30 border border-brand-800/40 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2">ATS tips</h3>
          <ul className="space-y-1.5">
            {cv.ats_notes.map((n, i) => <li key={i} className="text-brand-200 text-xs">• {n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function CoverLetterView({ text }: { text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Cover letter</h3>
        <CopyBtn text={text} />
      </div>
      <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-sans">{text}</pre>
    </div>
  )
}

function InterviewView({ pack }: { pack: NonNullable<KitResult['artifacts']['interview_pack']> }) {
  return (
    <div className="space-y-6">
      {pack.technical_topics && pack.technical_topics.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Topics to study</h3>
          <div className="flex flex-wrap gap-2">
            {pack.technical_topics.map(t => (
              <span key={t} className="bg-surface-700 border border-white/[0.06] px-3 py-1 rounded-lg text-xs text-gray-300">{t}</span>
            ))}
          </div>
        </div>
      )}
      {pack.behavioral_questions && pack.behavioral_questions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Behavioral questions</h3>
          <ul className="space-y-2">
            {pack.behavioral_questions.map((q, i) => (
              <li key={i} className="text-gray-300 text-sm bg-surface-700 border border-white/[0.04] rounded-xl px-4 py-3">{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function OutreachView({ pack }: { pack: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {Object.entries(pack).map(([key, msg]) => (
        <div key={key} className="bg-surface-700 border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
            <CopyBtn text={msg} />
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">{msg}</pre>
        </div>
      ))}
    </div>
  )
}

function AtsView({ score, keywords, recs }: { score: number; keywords: string[]; recs: string[] }) {
  const color = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  const bg = score >= 75 ? 'bg-green-950/30 border-green-800/40' : score >= 50 ? 'bg-yellow-950/30 border-yellow-800/40' : 'bg-red-950/30 border-red-800/40'
  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-5 text-center ${bg}`}>
        <p className={`text-6xl font-extrabold ${color}`}>{score}<span className="text-2xl">/100</span></p>
        <p className="text-gray-400 text-sm mt-1">ATS compatibility score</p>
      </div>
      {keywords.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Missing keywords</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map(k => (
              <span key={k} className="bg-red-950/30 border border-red-800/30 px-2.5 py-1 rounded-lg text-xs text-red-300">{k}</span>
            ))}
          </div>
        </div>
      )}
      {recs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => <li key={i} className="text-gray-300 text-sm flex gap-2.5"><span className="text-brand-400 shrink-0">▸</span>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function KitResults({ result, onBack }: { result: KitResult; onBack: () => void }) {
  const [tab, setTab] = useState(0)
  const a = result.artifacts || {}

  const tabs = [
    a.cv && { label: 'CV', content: <CVView cv={a.cv} /> },
    a.cover_letter && { label: 'Cover Letter', content: <CoverLetterView text={a.cover_letter} /> },
    a.interview_pack && { label: 'Interview Prep', content: <InterviewView pack={a.interview_pack} /> },
    a.outreach_pack && { label: 'Outreach', content: <OutreachView pack={a.outreach_pack} /> },
    (a.ats_score !== undefined) && {
      label: 'ATS Score',
      content: <AtsView score={a.ats_score!} keywords={a.missing_keywords || []} recs={a.recommendations || []} />,
    },
  ].filter(Boolean) as { label: string; content: React.ReactNode }[]

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h1 className="text-xl font-bold text-white">Your career kit</h1>
        <span className="ml-auto text-xs text-gray-500 bg-surface-700 border border-white/[0.06] px-2.5 py-1 rounded-lg">
          {result.credits_charged} credits used
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-800 border border-white/[0.06] p-1 rounded-xl w-fit">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === i ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6">{tabs[tab]?.content}</div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function NewKitPage() {
  const [jobText, setJobText] = useState('')
  const [cvText, setCvText] = useState('')
  const [kind, setKind] = useState<KitKind>('full')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [result, setResult] = useState<KitResult | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  async function generate() {
    if (!jobText.trim()) { setError('Paste a job description to continue.'); return }
    setError('')
    setLoading(true)
    setProgress('Parsing job description…')
    try {
      const jobRes = await api.parseJob(jobText)
      setProgress('Building profile…')
      const profile = cvText.trim() ? { raw_cv: cvText } : {}
      setProgress('Generating kit with AI…')
      const kit = await api.generateKit({ job_id: jobRes.job_id, profile, kind })
      setResult(kit as KitResult)
      setStep('result')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  if (step === 'result' && result) {
    return <KitResults result={result} onBack={() => { setStep('input'); setResult(null) }} />
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Generate a career kit</h1>
      <p className="text-gray-400 text-sm mb-8">Paste a job description and let AI build your complete application package.</p>

      {/* Kit type */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Kit type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {KINDS.map(k => (
            <button key={k.id} onClick={() => setKind(k.id)}
              className={`card p-4 text-left transition-all ${kind === k.id ? 'border-brand-600/60 bg-brand-950/30' : 'hover:border-white/10'}`}>
              <p className={`font-semibold text-sm mb-0.5 ${kind === k.id ? 'text-brand-300' : 'text-white'}`}>{k.label}</p>
              <p className="text-gray-500 text-xs leading-snug mb-2">{k.sub}</p>
              <p className={`text-xs font-medium ${kind === k.id ? 'text-brand-400' : 'text-gray-600'}`}>{k.cost}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Job description */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Job description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={jobText}
          onChange={e => setJobText(e.target.value)}
          rows={10}
          className="input resize-none leading-relaxed"
          placeholder="Paste the full job description here — title, requirements, responsibilities…"
        />
      </div>

      {/* CV */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Your CV / experience <span className="text-gray-600 normal-case font-normal">(optional — improves results)</span>
        </label>
        <textarea
          value={cvText}
          onChange={e => setCvText(e.target.value)}
          rows={5}
          className="input resize-none leading-relaxed"
          placeholder="Paste your current CV or describe your experience, skills, and achievements…"
        />
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button onClick={generate} disabled={loading} className="btn-primary w-full py-3.5 text-base">
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {progress || 'Generating…'}
            </span>
          : `Generate ${KINDS.find(k => k.id === kind)?.label}`
        }
      </button>

      <p className="text-center text-gray-600 text-xs mt-3">
        {KINDS.find(k => k.id === kind)?.cost} will be deducted from your balance
      </p>
    </div>
  )
}
