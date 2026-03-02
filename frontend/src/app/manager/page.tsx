'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'

interface Session {
  id: string
  sub: string
  status: string
  channel: string
  fraud_score?: number
  fraud_flags?: string[]
  video_duration_s?: number
  created_at: number
  user_email?: string
  user_full_name?: string
  manager_note?: string
}

function FraudBar({ score }: { score?: number }) {
  if (score === undefined) return <span className="text-gray-600 text-xs">N/A</span>
  const color = score < 30 ? 'bg-emerald-500' : score < 65 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-600 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400 w-7 text-right">{score.toFixed(0)}</span>
    </div>
  )
}

export default function ManagerPortalPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeDoc, setActiveDoc] = useState<'front' | 'back' | 'video' | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return }
    fetchPending()
  }, [router])

  async function fetchPending() {
    setLoading(true)
    try {
      const data = await api.managerPending()
      setSessions(data.sessions || [])
    } catch {
      setError('Failed to load pending sessions')
    } finally {
      setLoading(false)
    }
  }

  async function openSession(s: Session) {
    setDetailLoading(true)
    setActiveDoc(null)
    setReviewNote('')
    setReviewSuccess('')
    setError('')
    try {
      const detail = await api.managerSessionDetail(s.id)
      setSelected(detail)
    } catch {
      setError('Failed to load session details')
    } finally {
      setDetailLoading(false)
    }
  }

  async function submitReview(decision: 'approved' | 'rejected') {
    if (!selected) return
    setReviewLoading(true)
    setError('')
    try {
      await api.managerReview(selected.id, decision, reviewNote)
      setReviewSuccess(`Session ${decision} successfully.`)
      setSessions(prev => prev.filter(s => s.id !== selected.id))
      setTimeout(() => { setSelected(null); setReviewSuccess('') }, 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Review failed')
    } finally {
      setReviewLoading(false)
    }
  }

  function docUrl(sessionId: string, type: 'front' | 'back' | 'video') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cf_token') || '' : ''
    return `${BACKEND}/v1/manager/session/${sessionId}/doc/${type}?_t=${token}`
  }

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Top bar */}
      <header className="bg-surface-800 border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold">
            <span className="text-gradient">Career</span>
            <span className="text-white">Forge</span>
          </span>
          <span className="text-xs font-semibold text-gray-500 bg-surface-700 border border-white/[0.06] px-2 py-1 rounded-md">
            Manager Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPending} className="text-xs text-gray-400 hover:text-white border border-white/[0.06] px-3 py-1.5 rounded-lg transition-all">
            Refresh
          </button>
          <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-500 hover:text-gray-300">
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Session list */}
        <aside className="w-80 border-r border-white/[0.06] overflow-y-auto bg-surface-800">
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Pending Reviews</h2>
            <p className="text-xs text-gray-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''} awaiting review</p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <svg className="w-6 h-6 text-brand-400 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">✓</div>
              <p className="text-sm text-gray-400">All clear — no pending reviews</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {sessions.map(s => (
                <button key={s.id}
                  onClick={() => openSession(s)}
                  className={`w-full text-left px-4 py-4 hover:bg-white/[0.03] transition-all ${
                    selected?.id === s.id ? 'bg-brand-600/10 border-l-2 border-brand-500' : ''
                  }`}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate">{s.user_email || s.sub.slice(0, 16)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                      s.channel === 'agent' ? 'bg-purple-900/40 text-purple-400' : 'bg-yellow-900/40 text-yellow-400'
                    }`}>{s.channel}</span>
                  </div>
                  <FraudBar score={s.fraud_score} />
                  <p className="text-xs text-gray-600 mt-1">{formatDate(s.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Detail panel */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-gray-400">Select a session from the list to review</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <svg className="w-8 h-8 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : (
            <div className="p-8 max-w-3xl">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-white">{selected.user_full_name || 'Unknown user'}</h2>
                  <span className="text-xs text-gray-500 font-mono bg-surface-700 px-2 py-0.5 rounded">
                    {selected.id.slice(0, 12)}…
                  </span>
                </div>
                <p className="text-sm text-gray-400">{selected.user_email}</p>
                <p className="text-xs text-gray-600 mt-1">Submitted {formatDate(selected.created_at)} · Channel: {selected.channel}</p>
              </div>

              {/* Fraud score */}
              <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5 mb-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Fraud Analysis</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      (selected.fraud_score || 0) < 30 ? 'text-emerald-400' :
                      (selected.fraud_score || 0) < 65 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {selected.fraud_score?.toFixed(0) ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">Fraud Score</div>
                  </div>
                  <div className="flex-1">
                    {(selected.fraud_flags || []).length > 0 ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Flags detected:</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.fraud_flags!.map(f => (
                            <span key={f} className="text-xs bg-yellow-900/30 border border-yellow-700/30 text-yellow-400 px-2 py-0.5 rounded-md font-mono">
                              {f.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-400">No flags detected</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5 mb-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Documents & Video</h3>
                <div className="flex gap-3 mb-4">
                  {(['front', 'back', 'video'] as const).map(type => (
                    <button key={type}
                      onClick={() => setActiveDoc(activeDoc === type ? null : type)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                        activeDoc === type
                          ? 'bg-brand-600/20 border-brand-600/40 text-brand-300'
                          : 'border-white/[0.06] text-gray-400 hover:border-white/20 hover:text-white'
                      }`}>
                      {type === 'front' ? '🪪 ID Front' : type === 'back' ? '🔖 ID Back' : '🎥 Video'}
                    </button>
                  ))}
                </div>

                {activeDoc && (
                  <div className="bg-black/40 rounded-xl overflow-hidden border border-white/[0.06]">
                    {activeDoc === 'video' ? (
                      /* eslint-disable-next-line jsx-a11y/media-has-caption */
                      <video
                        src={docUrl(selected.id, activeDoc)}
                        controls
                        controlsList="nodownload"
                        onContextMenu={e => e.preventDefault()}
                        className="w-full max-h-80 object-contain"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={docUrl(selected.id, activeDoc)}
                        alt={`Document ${activeDoc}`}
                        onContextMenu={e => e.preventDefault()}
                        draggable={false}
                        className="w-full max-h-80 object-contain select-none"
                      />
                    )}
                    <p className="text-center text-xs text-gray-600 py-2">
                      Read-only · No download · Session {selected.id.slice(0, 8)}
                    </p>
                  </div>
                )}
              </div>

              {/* Review */}
              {reviewSuccess ? (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5 text-center">
                  <p className="text-emerald-400 font-medium">{reviewSuccess}</p>
                </div>
              ) : (
                <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Manager Decision</h3>

                  <label className="block text-xs text-gray-500 mb-2">Note (optional)</label>
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Internal note about this review decision…"
                    className="w-full bg-surface-700 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none h-20 focus:outline-none focus:border-brand-500/50 mb-4"
                  />

                  {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => submitReview('rejected')}
                      disabled={reviewLoading}
                      className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all disabled:opacity-50">
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => submitReview('approved')}
                      disabled={reviewLoading}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all disabled:opacity-50">
                      ✓ Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
