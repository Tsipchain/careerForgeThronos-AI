'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api, CvAnalysis, CvAnalysisMeta } from '@/lib/api'
import { getToken } from '@/lib/auth'

const BASE = process.env.NEXT_PUBLIC_API_URL || ''

async function uploadCvFile(file: File): Promise<{ analysis_id: string; analysis: CvAnalysis; credits_charged: number }> {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/v1/cv/analyze`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
  return data
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171'
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 42}`}
          strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-extrabold text-white">{score}</p>
        <p className="text-xs text-gray-500">ATS</p>
      </div>
    </div>
  )
}

function AnalysisCard({ a }: { a: CvAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <ScoreRing score={a.ats_score} />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">
            {a.candidate_name || 'Your CV'}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">{a.summary}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {a.sections_found.map(s => (
              <span key={s} className="text-xs bg-brand-950/60 border border-brand-800/40 text-brand-300 px-2.5 py-1 rounded-full capitalize">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Skills */}
      {a.detected_skills.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Detected Skills</p>
          <div className="flex flex-wrap gap-2">
            {a.detected_skills.map(s => (
              <span key={s} className="text-xs bg-white/[0.05] border border-white/[0.08] text-gray-300 px-2.5 py-1 rounded-lg">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-500 mb-3">Strengths</p>
          <ul className="space-y-2">
            {a.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">Weaknesses</p>
          <ul className="space-y-2">
            {a.weaknesses.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Improvements */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Recommended Improvements</p>
        <ol className="space-y-2">
          {a.improvements.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-300">
              <span className="text-brand-500 font-bold shrink-0 tabular-nums">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/kit/new" className="btn-primary px-5 py-2.5 text-sm">
          Generate full kit from this CV →
        </Link>
        <Link href="/dashboard/jobs" className="btn-ghost px-5 py-2.5 text-sm">
          Browse remote jobs
        </Link>
      </div>
    </div>
  )
}

export default function CvPage() {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null)
  const [history, setHistory] = useState<CvAnalysisMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<'upload' | 'history'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.listCvAnalyses().then(r => setHistory(r.analyses || [])).catch(() => {})
  }, [])

  async function handleFile(file: File) {
    if (!file) return
    setLoading(true)
    setError('')
    setAnalysis(null)
    try {
      const res = await uploadCvFile(file)
      setAnalysis(res.analysis)
      setHistory(prev => [{ id: res.analysis_id, filename: file.name, ats_score: res.analysis.ats_score, credits_charged: res.credits_charged, created_at: Date.now() / 1000 }, ...prev])
      setTab('upload')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">CV Analysis</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload your CV for AI analysis, ATS scoring, and improvement tips · 2 credits</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-800 border border-white/[0.06] p-1 rounded-xl w-fit">
        {(['upload', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'upload' ? 'Analyze CV' : `History (${history.length})`}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div className="space-y-6">
          {/* Drop zone */}
          {!analysis && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`card p-12 text-center cursor-pointer border-2 border-dashed transition-all ${
                dragOver ? 'border-brand-500 bg-brand-950/30' : 'border-white/[0.08] hover:border-brand-700/60 hover:bg-white/[0.02]'
              }`}>
              <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={onFileInput} />
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-gray-400 text-sm">Analysing your CV…</p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-brand-950/60 border border-brand-800/40 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white mb-1">Drop your CV here</h3>
                  <p className="text-gray-500 text-sm">PDF or plain text · max 8 MB · 2 credits</p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="card border-red-800/40 bg-red-950/20 p-4 text-red-400 text-sm">{error}</div>
          )}

          {analysis && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Analysis Result</p>
                <button onClick={() => { setAnalysis(null); setError('') }}
                  className="text-xs text-gray-500 hover:text-white transition-colors">
                  ← Analyse another
                </button>
              </div>
              <AnalysisCard a={analysis} />
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="card p-10 text-center text-gray-500 text-sm">No CV analyses yet.</div>
          ) : (
            <div className="card divide-y divide-white/[0.05]">
              {history.map(h => {
                const scoreColor = h.ats_score >= 80 ? 'text-green-400' : h.ats_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div key={h.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`text-2xl font-extrabold tabular-nums w-14 text-center ${scoreColor}`}>
                      {h.ats_score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{h.filename || 'CV'}</p>
                      <p className="text-xs text-gray-500">{new Date(h.created_at * 1000).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs text-gray-600">{h.credits_charged} cr</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
