'use client'
import { useEffect, useState } from 'react'
import { api, RemoteOkJob } from '@/lib/api'

const POPULAR_TAGS = ['react', 'python', 'devops', 'go', 'typescript', 'design', 'marketing', 'data']

export default function JobsPage() {
  const [jobs, setJobs] = useState<RemoteOkJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tag, setTag] = useState('')
  const [ingesting, setIngesting] = useState<string | null>(null)
  const [ingestedSlugs, setIngestedSlugs] = useState<Set<string>>(new Set())

  async function fetch_(t: string) {
    setLoading(true)
    setError('')
    try {
      const res = await api.listRemoteOkJobs(t || undefined)
      setJobs(res.jobs || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch_('') }, [])

  async function ingest(job: RemoteOkJob) {
    if (ingesting) return
    setIngesting(job.slug)
    try {
      await api.ingestRemoteOkJob(job.slug)
      setIngestedSlugs(prev => new Set([...prev, job.slug]))
    } catch {
      // silently fail — user can retry
    } finally {
      setIngesting(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Remote Jobs</h1>
        <p className="text-gray-500 text-sm mt-0.5">Browse live remote jobs from RemoteOK — free, no credits</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          value={tag}
          onChange={e => setTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetch_(tag)}
          placeholder="Filter by tag (e.g. react, python…)"
          className="flex-1 min-w-[200px] bg-surface-800 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-600/50 placeholder-gray-600"
        />
        <button onClick={() => fetch_(tag)} className="btn-primary px-5 py-2.5 text-sm">Search</button>
      </div>

      {/* Quick tag chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {POPULAR_TAGS.map(t => (
          <button key={t} onClick={() => { setTag(t); fetch_(t) }}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${tag === t ? 'bg-brand-600 border-brand-600 text-white' : 'border-white/[0.08] text-gray-400 hover:text-white hover:border-brand-700/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {error && <div className="card border-red-800/40 bg-red-950/20 p-4 text-red-400 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="card p-10 text-center">
          <svg className="animate-spin w-6 h-6 text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.length === 0 && <p className="text-gray-500 text-sm card p-8 text-center">No jobs found for this tag.</p>}
          {jobs.map(job => {
            const alreadyIngested = ingestedSlugs.has(job.slug)
            return (
              <div key={job.slug} className="card p-5 flex gap-4 items-start hover:border-brand-700/40 transition-all">
                {/* Logo */}
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                  {job.logo ? (
                    <img src={job.logo} alt={job.company} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-500 text-xs font-bold">{job.company[0]}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-white text-sm">{job.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{job.company} · {job.location}</p>
                    </div>
                    {job.salary && (
                      <span className="text-xs text-green-400 font-medium bg-green-950/40 border border-green-800/30 px-2.5 py-1 rounded-full shrink-0">
                        {job.salary}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.tags.slice(0, 6).map(t => (
                      <span key={t} className="text-xs bg-white/[0.04] border border-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                      View job →
                    </a>
                    <button
                      onClick={() => ingest(job)}
                      disabled={!!ingesting || alreadyIngested}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                        alreadyIngested
                          ? 'border-green-800/40 text-green-400 bg-green-950/20 cursor-default'
                          : 'border-brand-700/40 text-brand-400 hover:bg-brand-950/40 disabled:opacity-40'
                      }`}>
                      {ingesting === job.slug ? 'Saving…' : alreadyIngested ? 'Saved ✓' : 'Save & generate kit'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
