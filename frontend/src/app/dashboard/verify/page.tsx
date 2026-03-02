'use client'
import { useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

type Step = 'intro' | 'upload' | 'processing' | 'result'
type Status = 'approved' | 'manager_review' | 'rejected' | 'pending'

interface VerifySession {
  session_id: string
  channel: string
  status: Status
  fraud_score?: number
  flags?: string[]
  message?: string
}

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('intro')
  const [session, setSession] = useState<VerifySession | null>(null)
  const [docFront, setDocFront] = useState<string>('')
  const [docBack, setDocBack] = useState<string>('')
  const [video, setVideo] = useState<string>('')
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFrontUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setDocFront(b64)
  }

  async function handleBackUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setDocBack(b64)
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setVideo(b64)
    // Get duration
    const url = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.src = url
    vid.onloadedmetadata = () => {
      setVideoDuration(vid.duration || 0)
      URL.revokeObjectURL(url)
    }
  }

  async function startSession() {
    setLoading(true)
    setError('')
    try {
      const data = await api.verifyStart()
      setSession(data)
      if (data.status === 'approved') {
        setStep('result')
      } else {
        setStep('upload')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  async function submitVerification() {
    if (!session) return
    if (!docFront) {
      setError('Please upload the front of your ID document.')
      return
    }
    setLoading(true)
    setError('')
    setStep('processing')
    try {
      const data = await api.verifyUpload({
        session_id: session.session_id,
        doc_front: docFront,
        doc_back: docBack || undefined,
        video: video || undefined,
        video_duration_s: videoDuration || undefined,
      })
      setSession({ ...session, ...data })
      setStep('result')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig: Record<Status, { color: string; icon: string; title: string; desc: string }> = {
    approved: {
      color: 'text-emerald-400',
      icon: '✓',
      title: 'Identity Verified',
      desc: 'Your identity has been successfully verified. Your account is now fully trusted.',
    },
    manager_review: {
      color: 'text-yellow-400',
      icon: '⏳',
      title: 'Under Review',
      desc: 'Your documents have been received and are being reviewed by our team. This typically takes 1–24 hours.',
    },
    rejected: {
      color: 'text-red-400',
      icon: '✗',
      title: 'Verification Failed',
      desc: 'We could not verify your identity. Please contact support for assistance.',
    },
    pending: {
      color: 'text-brand-400',
      icon: '●',
      title: 'Pending Upload',
      desc: 'Please upload your documents to proceed.',
    },
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Identity Verification</h1>
        <p className="text-gray-400">Verify your identity to unlock advanced features and build trust with employers.</p>
      </div>

      {/* Step: Intro */}
      {step === 'intro' && (
        <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Secure Identity Verification</h2>
              <p className="text-sm text-gray-400">AI-powered + human review when needed</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">What you'll need</h3>
            {[
              { icon: '🪪', text: 'A valid government-issued ID (passport, national ID card, or driver\'s license)' },
              { icon: '📸', text: 'Clear photos of the front (and optionally back) of your document' },
              { icon: '🎥', text: 'A short selfie video (5–15 seconds) for liveness check' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="text-base">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-brand-600/10 border border-brand-600/20 rounded-xl p-4 mb-6">
            <p className="text-xs text-brand-300">
              <strong>Privacy:</strong> Your documents are processed securely and never shared with third parties.
              All data is encrypted and stored on Thronos infrastructure.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button onClick={startSession} disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : null}
            Start Verification
          </button>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {session?.channel === 'agent' && (
            <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-xl p-4">
              <p className="text-sm text-yellow-300">
                <strong>Agent Video Call:</strong> An agent will contact you shortly for a video verification call.
                Please upload your documents below so they are ready for review.
              </p>
            </div>
          )}

          {/* Document Front */}
          <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-6">
            <h3 className="text-base font-semibold text-white mb-1">ID Document — Front <span className="text-red-400">*</span></h3>
            <p className="text-xs text-gray-500 mb-4">Photo of the front side of your passport, national ID, or driver's license</p>

            <div
              onClick={() => frontRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                docFront ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-brand-500/40 hover:bg-brand-600/5'
              }`}>
              {docFront ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={docFront} alt="Document front" className="max-h-32 mx-auto rounded-lg mb-2 object-contain" />
                  <p className="text-xs text-emerald-400">Document uploaded ✓</p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm text-gray-400">Click to upload</p>
                  <p className="text-xs text-gray-600 mt-1">JPG, PNG — max 10 MB</p>
                </div>
              )}
            </div>
            <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={handleFrontUpload} />
          </div>

          {/* Document Back */}
          <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-6">
            <h3 className="text-base font-semibold text-white mb-1">ID Document — Back <span className="text-gray-500">(optional)</span></h3>
            <p className="text-xs text-gray-500 mb-4">Back side of your ID card if applicable</p>

            <div
              onClick={() => backRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                docBack ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-brand-500/40'
              }`}>
              {docBack ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={docBack} alt="Document back" className="max-h-32 mx-auto rounded-lg mb-2 object-contain" />
                  <p className="text-xs text-emerald-400">Document uploaded ✓</p>
                </div>
              ) : (
                <div className="text-gray-600">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">Click to upload (optional)</p>
                </div>
              )}
            </div>
            <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={handleBackUpload} />
          </div>

          {/* Selfie Video */}
          <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-6">
            <h3 className="text-base font-semibold text-white mb-1">Selfie Video <span className="text-gray-500">(recommended)</span></h3>
            <p className="text-xs text-gray-500 mb-4">Record a 5–15 second video of yourself holding your ID. Speak your full name clearly.</p>

            <div
              onClick={() => videoRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                video ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-brand-500/40'
              }`}>
              {video ? (
                <div>
                  <div className="text-3xl mb-2">🎬</div>
                  <p className="text-sm text-emerald-400">Video uploaded ✓ ({videoDuration.toFixed(1)}s)</p>
                </div>
              ) : (
                <div className="text-gray-600">
                  <div className="text-3xl mb-2">🎥</div>
                  <p className="text-sm">Click to upload video</p>
                  <p className="text-xs mt-1">MP4, WebM — max 30 MB</p>
                </div>
              )}
            </div>
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button onClick={submitVerification} disabled={loading || !docFront}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : null}
            Submit for Verification
          </button>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-12 text-center">
          <svg className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <h2 className="text-lg font-semibold text-white mb-2">Analysing your documents…</h2>
          <p className="text-sm text-gray-400">Our AI is performing fraud checks and document validation.</p>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && session && (
        <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-8 text-center">
          {(() => {
            const cfg = statusConfig[session.status] || statusConfig.pending
            return (
              <>
                <div className={`text-5xl font-bold mb-4 ${cfg.color}`}>{cfg.icon}</div>
                <h2 className={`text-2xl font-bold mb-3 ${cfg.color}`}>{cfg.title}</h2>
                <p className="text-gray-300 mb-6">{session.message || cfg.desc}</p>

                {session.fraud_score !== undefined && session.status !== 'approved' && (
                  <div className="bg-surface-700 rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs text-gray-500 mb-1">AI Fraud Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-surface-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            session.fraud_score < 30 ? 'bg-emerald-500' :
                            session.fraud_score < 65 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${session.fraud_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono text-gray-300">{session.fraud_score.toFixed(0)}</span>
                    </div>
                  </div>
                )}

                {session.flags && session.flags.length > 0 && (
                  <div className="bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs font-semibold text-yellow-400 mb-2">Review flags:</p>
                    <ul className="space-y-1">
                      {session.flags.map((f, i) => (
                        <li key={i} className="text-xs text-yellow-300 font-mono">• {f.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.status === 'rejected' && (
                  <button onClick={() => { setStep('intro'); setSession(null); setDocFront(''); setDocBack(''); setVideo('') }}
                    className="btn-secondary px-6 py-2">
                    Try Again
                  </button>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
