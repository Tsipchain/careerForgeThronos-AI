'use client'
import { useEffect, useState } from 'react'
import { api, RemoteOkJob, CountryContext, CountrySummary } from '@/lib/api'

const POPULAR_TAGS = ['react', 'python', 'devops', 'go', 'typescript', 'rust', 'design', 'marketing', 'data', 'ai']

// ── Work mode badge ────────────────────────────────────────────────────────
const WORK_MODE: Record<string, { label: string; cls: string }> = {
  remote:      { label: 'Remote',  cls: 'text-green-400 bg-green-950/40 border-green-800/30' },
  hybrid:      { label: 'Hybrid',  cls: 'text-blue-400 bg-blue-950/40 border-blue-800/30' },
  on_site:     { label: 'On-site', cls: 'text-orange-400 bg-orange-950/40 border-orange-800/30' },
  unspecified: { label: 'Flexible', cls: 'text-gray-400 bg-white/[0.04] border-white/[0.08]' },
}

// ── Contract type badge ────────────────────────────────────────────────────
const CONTRACT: Record<string, { label: string; cls: string }> = {
  employment:  { label: 'Employment', cls: 'text-brand-400 bg-brand-950/40 border-brand-800/30' },
  b2b:         { label: 'B2B',        cls: 'text-purple-400 bg-purple-950/40 border-purple-800/30' },
  freelance:   { label: 'Freelance',  cls: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/30' },
  b2c:         { label: 'B2C',        cls: 'text-pink-400 bg-pink-950/40 border-pink-800/30' },
  part_time:   { label: 'Part-time',  cls: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/30' },
  internship:  { label: 'Internship', cls: 'text-teal-400 bg-teal-950/40 border-teal-800/30' },
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>
  )
}

// ── Country Context Drawer ─────────────────────────────────────────────────
function CountryDrawer({ code, onClose }: { code: string; onClose: () => void }) {
  const [ctx, setCtx] = useState<CountryContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCountryContext(code)
      .then(setCtx)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [code])

  const colIdx = ctx?.cost_of_living_index ?? 0
  const colBar = Math.min(colIdx, 130)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <aside className="w-full max-w-md bg-surface-800 border-l border-white/[0.08] overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <svg className="animate-spin w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : !ctx ? (
          <div className="p-8 text-gray-500 text-sm">Country data not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-surface-800 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{ctx.flag}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{ctx.name}</h2>
                  <p className="text-gray-500 text-xs">{ctx.region}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Currency', val: ctx.currency },
                  { label: 'Timezone', val: ctx.timezone },
                  { label: 'Language(s)', val: ctx.official_languages.join(', ') },
                  { label: 'Income Tax (top)', val: `${ctx.income_tax_top_pct}%` },
                  { label: 'Social Sec (emp)', val: `${ctx.social_security_employee_pct}%` },
                  { label: 'Social Sec (er)', val: `${ctx.social_security_employer_pct}%` },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
                    <p className="text-sm font-semibold text-white">{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Cost of living bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Cost of Living Index</span>
                  <span className="text-white font-semibold">{colIdx} <span className="text-gray-600 font-normal">(NYC = 100)</span></span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${colIdx < 55 ? 'bg-green-500' : colIdx < 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${(colBar / 130) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Cheap</span><span>Moderate</span><span>Expensive</span>
                </div>
              </div>

              {/* Tech salaries */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Avg Tech Salary (USD/year)</p>
                <div className="space-y-1">
                  {[
                    ['Junior', ctx.avg_tech_salary_usd.junior],
                    ['Mid', ctx.avg_tech_salary_usd.mid],
                    ['Senior', ctx.avg_tech_salary_usd.senior],
                  ].map(([lvl, range]) => (
                    <div key={lvl} className="flex justify-between text-sm">
                      <span className="text-gray-400">{lvl}</span>
                      <span className="text-white font-medium">{range}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Healthcare */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5">Healthcare</p>
                <p className="text-sm text-gray-300">{ctx.healthcare}</p>
              </div>

              {/* Contract & B2B notes */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5">B2B / Contractor Notes</p>
                <p className="text-sm text-gray-300 leading-relaxed">{ctx.b2b_contractor_notes}</p>
              </div>

              {/* Visas */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Work & Visa</p>
                <div className="space-y-2">
                  {ctx.digital_nomad_visa && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Digital Nomad Visa available
                    </div>
                  )}
                  {ctx.eu_citizen_right_to_work && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      EU citizens: right to work
                    </div>
                  )}
                  <p className="text-xs text-gray-400">{ctx.non_eu_work_permit}</p>
                </div>
              </div>

              {/* Remote work culture */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5">Remote Work Culture</p>
                <p className="text-sm text-gray-300">{ctx.remote_work_culture}</p>
              </div>

              {/* Key facts */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Key Facts</p>
                <ul className="space-y-1.5">
                  {ctx.key_facts.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-brand-500 shrink-0 mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quality of life */}
              <div className="bg-brand-950/30 border border-brand-800/30 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-1">Quality of Life</p>
                <p className="text-sm text-gray-300">{ctx.quality_of_life}</p>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

// ── Country Explorer tab ───────────────────────────────────────────────────
function CountryExplorer() {
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.listCountries().then(r => setCountries(r.countries || [])).catch(() => {})
  }, [])

  const visible = countries.filter(c =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.region.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search countries…"
        className="w-full mb-4 bg-surface-800 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-600/50 placeholder-gray-600"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map(c => (
          <button key={c.code} onClick={() => setSelected(c.code)}
            className="card p-4 text-left hover:border-brand-700/50 transition-all flex gap-3 items-start">
            <span className="text-2xl shrink-0">{c.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{c.name}</p>
              <p className="text-xs text-gray-500 truncate">{c.region}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs text-gray-400">CoL: <span className="text-white font-medium">{c.cost_of_living_index}</span></span>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-400">Tax: <span className="text-white font-medium">{c.income_tax_top_pct}%</span></span>
                {c.digital_nomad_visa && (
                  <>
                    <span className="text-gray-700">·</span>
                    <span className="text-xs text-green-400 font-medium">Nomad Visa</span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      {selected && <CountryDrawer code={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [jobs, setJobs] = useState<RemoteOkJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tag, setTag] = useState('')
  const [ingesting, setIngesting] = useState<string | null>(null)
  const [ingestedSlugs, setIngestedSlugs] = useState<Set<string>>(new Set())
  const [countryDrawer, setCountryDrawer] = useState<string | null>(null)
  const [tab, setTab] = useState<'jobs' | 'countries'>('jobs')

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
    } catch { /* silent */ } finally {
      setIngesting(null)
    }
  }

  // Try to detect country from job location/tags
  function jobCountryCode(job: RemoteOkJob): string | null {
    const text = `${job.location} ${job.tags.join(' ')}`.toLowerCase()
    if (text.includes('germany') || text.includes('berlin') || text.includes('munich')) return 'DE'
    if (text.includes('netherlands') || text.includes('amsterdam')) return 'NL'
    if (text.includes('portugal') || text.includes('lisbon')) return 'PT'
    if (text.includes('spain') || text.includes('barcelona') || text.includes('madrid')) return 'ES'
    if (text.includes('greece') || text.includes('athens')) return 'GR'
    if (text.includes('uk') || text.includes('london') || text.includes('united kingdom')) return 'GB'
    if (text.includes('usa') || text.includes('us') || text.includes('united states') || text.includes('new york')) return 'US'
    if (text.includes('canada') || text.includes('toronto') || text.includes('vancouver')) return 'CA'
    if (text.includes('australia') || text.includes('sydney') || text.includes('melbourne')) return 'AU'
    if (text.includes('dubai') || text.includes('uae') || text.includes('emirates')) return 'AE'
    if (text.includes('estonia') || text.includes('tallinn')) return 'EE'
    if (text.includes('poland') || text.includes('warsaw') || text.includes('krakow')) return 'PL'
    if (text.includes('romania') || text.includes('bucharest') || text.includes('cluj')) return 'RO'
    return null
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Remote Jobs</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Browse live remote jobs from RemoteOK · free · tap a country flag for cost of living, taxes & visa info
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-800 border border-white/[0.06] p-1 rounded-xl w-fit">
        {[
          { id: 'jobs', label: 'Job Board' },
          { id: 'countries', label: 'Country Explorer' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'countries' && <CountryExplorer />}

      {tab === 'jobs' && (
        <>
          {/* Search */}
          <div className="flex gap-3 mb-4 flex-wrap">
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

          {/* Tag chips */}
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
              {jobs.length === 0 && <p className="text-gray-500 text-sm card p-8 text-center">No jobs found.</p>}
              {jobs.map(job => {
                const alreadyIngested = ingestedSlugs.has(job.slug)
                const wm = WORK_MODE['remote']  // RemoteOK is always remote
                const countryCode = jobCountryCode(job)
                return (
                  <div key={job.slug} className="card p-5 hover:border-brand-700/40 transition-all">
                    <div className="flex gap-4 items-start">
                      {/* Logo */}
                      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                        {job.logo ? (
                          <img src={job.logo} alt={job.company} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-gray-500 text-xs font-bold">{job.company[0]}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title + salary */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-white text-sm">{job.title}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{job.company}</p>
                          </div>
                          {job.salary && (
                            <span className="text-xs text-green-400 font-medium bg-green-950/40 border border-green-800/30 px-2.5 py-1 rounded-full shrink-0">
                              {job.salary}
                            </span>
                          )}
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                          <Badge {...wm} />
                          <Badge {...CONTRACT['employment']} />
                          {countryCode && (
                            <button
                              onClick={() => setCountryDrawer(countryCode)}
                              className="text-xs px-2 py-0.5 rounded-full border border-white/[0.08] text-gray-300 hover:border-brand-600/50 hover:text-white transition-all flex items-center gap-1">
                              {countryCode}
                              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {job.tags.slice(0, 6).map(t => (
                            <span key={t} className="text-xs bg-white/[0.04] border border-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-3">
                          <a href={job.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                            View job →
                          </a>
                          <button onClick={() => ingest(job)} disabled={!!ingesting || alreadyIngested}
                            className={`text-xs px-3 py-1 rounded-lg border transition-all ${alreadyIngested ? 'border-green-800/40 text-green-400 bg-green-950/20 cursor-default' : 'border-brand-700/40 text-brand-400 hover:bg-brand-950/40 disabled:opacity-40'}`}>
                            {ingesting === job.slug ? 'Saving…' : alreadyIngested ? 'Saved ✓' : 'Save & generate kit'}
                          </button>
                          {countryCode && (
                            <button onClick={() => setCountryDrawer(countryCode)}
                              className="text-xs text-gray-500 hover:text-white transition-colors">
                              Living in {countryCode} →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Country drawer */}
      {countryDrawer && <CountryDrawer code={countryDrawer} onClose={() => setCountryDrawer(null)} />}
    </div>
  )
}
