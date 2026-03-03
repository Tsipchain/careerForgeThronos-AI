'use client'
import { useState, useRef } from 'react'
import { api } from '@/lib/api'

type Step = 'intro' | 'upload' | 'submitted'

interface SessionInfo {
  session_id: string
  channel: string
  status: string
  video_call_url: string
  message?: string
  fraud_score?: number
  risk_level?: string
  flags?: string[]
}

const RISK_COLOUR: Record<string, string> = {
  low_risk:    'text-emerald-400',
  medium_risk: 'text-yellow-400',
  high_risk:   'text-red-400',
}

export default function VerifyPage() {
  const [step, setStep]       = useState<Step>('intro')
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [docFront, setDocFront] = useState('')
  const [docBack,  setDocBack]  = useState('')
  const [video,    setVideo]    = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const frontRef = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  function fileToB64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  async function onFront(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setDocFront(await fileToB64(f))
  }
  async function onBack(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setDocBack(await fileToB64(f))
  }
  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const b64 = await fileToB64(f)
    setVideo(b64)
    const url = URL.createObjectURL(f)
    const el = document.createElement('video')
    el.src = url
    el.onloadedmetadata = () => { setVideoDuration(el.duration || 0); URL.revokeObjectURL(url) }
  }

  async function startSession() {
    setLoading(true); setError('')
    try {
      const data = await api.verifyStart()
      setSession(data as unknown as SessionInfo)
      setStep('upload')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start session')
    } finally { setLoading(false) }
  }

  async function submitDocs() {
    if (!session || !docFront) { setError('Please upload the front of your ID.'); return }
    setLoading(true); setError('')
    try {
      const data = await api.verifyUpload({
        session_id: session.session_id,
        doc_front: docFront,
        doc_back: docBack || undefined,
        video: video || undefined,
        video_duration_s: videoDuration || undefined,
      })
      setSession(prev => ({ ...prev!, ...(data as unknown as Partial<SessionInfo>) }))
      setStep('submitted')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally { setLoading(false) }
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === 'intro') return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Identity Verification</h1>
      <p className="text-gray-400 mb-8">Verify your identity to unlock advanced features and build trust with employers.</p>

      <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Secure verification reviewed by humans</h2>
            <p className="text-xs text-gray-500 mt-0.5">Every submission is reviewed by a manager or agent — never by AI alone</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {[
            { icon: '🪪', title: 'Upload your ID', desc: 'Front (required) + back (optional) of your passport, national ID, or driver\'s licence' },
            { icon: '🎥', title: 'Short video (recommended)', desc: 'Record a 5–15s selfie video holding your ID' },
            { icon: '📹', title: 'Live video call (optional)', desc: 'Join a secure Jitsi room with a manager for real-time verification — same as VerifyID' },
            { icon: '✅', title: 'Manager review', desc: 'A human manager views your documents and approves or requests more info' },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-brand-600/10 border border-brand-600/20 rounded-xl p-3 mb-6">
          <p className="text-xs text-brand-300">
            Your documents are stored encrypted and are only accessible to authorised managers.
            They are never shared with third parties.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={startSession} disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          Start Verification
        </button>
      </div>
    </div>
  )

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  if (step === 'upload' && session) return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Upload your documents</h1>
        <p className="text-xs text-gray-500">Session: <span className="font-mono">{session.session_id.slice(0, 12)}…</span></p>
      </div>

      {/* Video call banner — always show */}
      <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl">📹</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-300 mb-1">
            {session.channel === 'agent' ? 'Agent video call' : 'Live video verification room'}
          </p>
          <p className="text-xs text-gray-400 mb-3">
            {session.channel === 'agent'
              ? 'An agent will join your room to verify your identity live.'
              : 'No agent is online right now. Join the Jitsi room and a manager will verify you via video — just like the VerifyID portal.'}
          </p>
          <a href={session.video_call_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Join Video Room
          </a>
        </div>
      </div>

      {/* Doc Front */}
      <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5">
        <p className="text-sm font-semibold text-white mb-1">ID Front <span className="text-red-400">*</span></p>
        <p className="text-xs text-gray-500 mb-3">Passport, National ID, or Driver's Licence — front side</p>
        <div onClick={() => frontRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${docFront ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-brand-500/40 hover:bg-brand-600/5'}`}>
          {docFront
            ? <> {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={docFront} alt="ID front" className="max-h-28 mx-auto rounded mb-1 object-contain" />
                <p className="text-xs text-emerald-400">✓ Uploaded</p>
              </>
            : <><div className="text-3xl mb-1">🪪</div><p className="text-sm text-gray-500">Click to upload (JPG / PNG / WEBP)</p></>
          }
        </div>
        <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={onFront} />
      </div>

      {/* Doc Back */}
      <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5">
        <p className="text-sm font-semibold text-white mb-1">ID Back <span className="text-gray-500 font-normal">(optional)</span></p>
        <p className="text-xs text-gray-500 mb-3">Back of ID card if applicable (not needed for passports)</p>
        <div onClick={() => backRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${docBack ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}>
          {docBack
            ? <> {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={docBack} alt="ID back" className="max-h-28 mx-auto rounded mb-1 object-contain" />
                <p className="text-xs text-emerald-400">✓ Uploaded</p>
              </>
            : <><div className="text-2xl mb-1 text-gray-600">🔖</div><p className="text-sm text-gray-600">Optional — click to upload</p></>
          }
        </div>
        <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={onBack} />
      </div>

      {/* Selfie video */}
      <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5">
        <p className="text-sm font-semibold text-white mb-1">Selfie Video <span className="text-gray-500 font-normal">(recommended)</span></p>
        <p className="text-xs text-gray-500 mb-3">5–15 second video of yourself holding your ID. Helps the manager verify faster.</p>
        <div onClick={() => videoRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${video ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}>
          {video
            ? <><div className="text-3xl mb-1">🎬</div><p className="text-xs text-emerald-400">✓ Video uploaded ({videoDuration.toFixed(1)}s)</p></>
            : <><div className="text-2xl mb-1 text-gray-600">🎥</div><p className="text-sm text-gray-600">Optional — click to upload (MP4 / WebM)</p></>
          }
        </div>
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={onVideo} />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button onClick={submitDocs} disabled={loading || !docFront}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
        Submit Documents for Review
      </button>
    </div>
  )

  // ── SUBMITTED ─────────────────────────────────────────────────────────────
  if (step === 'submitted' && session) {
    const isRejected = session.status === 'rejected'
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-8">
          {isRejected ? (
            <>
              <div className="text-4xl mb-4 text-center">⚠️</div>
              <h2 className="text-xl font-bold text-red-400 text-center mb-3">Document Error</h2>
              <p className="text-gray-300 text-sm text-center mb-6">
                Your file could not be processed. Please upload a clear JPEG or PNG photo of your ID.
              </p>
              <button onClick={() => { setStep('intro'); setSession(null); setDocFront(''); setDocBack(''); setVideo('') }}
                className="btn-primary w-full py-3">Try Again</button>
            </>
          ) : (
            <>
              {/* Success */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Documents submitted</h2>
                <p className="text-sm text-gray-400">A manager will review your submission and verify your identity.</p>
              </div>

              {/* AI hint badge */}
              {session.risk_level && (
                <div className="bg-surface-700 rounded-xl p-4 mb-5">
                  <p className="text-xs text-gray-500 mb-1">AI risk hint (for manager reference)</p>
                  <span className={`text-sm font-semibold ${RISK_COLOUR[session.risk_level] || 'text-gray-400'}`}>
                    {session.risk_level.replace('_', ' ').toUpperCase()}
                    {session.fraud_score !== undefined && <span className="text-gray-500 font-mono ml-2">({session.fraud_score}/100)</span>}
                  </span>
                  {session.flags && session.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {session.flags.map(f => (
                        <span key={f} className="text-xs bg-surface-600 text-gray-400 px-2 py-0.5 rounded font-mono">
                          {f.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Video call CTA */}
              {session.video_call_url && (
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-indigo-300 mb-1">Speed up your review</p>
                  <p className="text-xs text-gray-400 mb-3">
                    Join the live video room. A manager can verify you in real time and approve your account immediately.
                  </p>
                  <a href={session.video_call_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Video Room
                  </a>
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-gray-600">Typical review time: a few hours during business hours</p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}
