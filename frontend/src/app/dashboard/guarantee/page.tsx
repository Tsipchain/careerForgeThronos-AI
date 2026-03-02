'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface GuaranteeStatus {
  kit_count: number
  days_active: number
  eligible_for_refund: boolean
  existing_request: { id: string; status: string; credits_refunded: number } | null
}

export default function GuaranteePage() {
  const [status, setStatus] = useState<GuaranteeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.guaranteeStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load guarantee status'))
      .finally(() => setLoading(false))
  }, [])

  async function submitRequest() {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const data = await api.guaranteeRequest(reason)
      setSuccess('Your refund request has been submitted. We\'ll review it within 48 hours.')
      setStatus(prev => prev ? {
        ...prev,
        existing_request: { id: data.request_id, status: 'pending', credits_refunded: 0 },
      } : prev)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const daysRemaining = status ? Math.max(0, 7 - status.days_active) : 7

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">CareerForge 7-Day Promise</h1>
        <p className="text-gray-400">
          We stand behind our platform. If you've generated a career kit and haven't landed a job opportunity
          within 7 days, we'll refund your credits.
        </p>
      </div>

      {loading && (
        <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-8 text-center">
          <svg className="w-6 h-6 text-brand-400 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}

      {!loading && status && (
        <div className="space-y-6">
          {/* Status cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5 text-center">
              <div className="text-3xl font-bold text-white mb-1">{status.kit_count}</div>
              <div className="text-xs text-gray-500">Kits Generated</div>
            </div>
            <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5 text-center">
              <div className="text-3xl font-bold text-white mb-1">{status.days_active}</div>
              <div className="text-xs text-gray-500">Days Active</div>
            </div>
            <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5 text-center">
              <div className={`text-3xl font-bold mb-1 ${status.eligible_for_refund ? 'text-emerald-400' : 'text-gray-500'}`}>
                {status.eligible_for_refund ? '✓' : daysRemaining}
              </div>
              <div className="text-xs text-gray-500">
                {status.eligible_for_refund ? 'Eligible' : 'Days Until Eligible'}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {!status.eligible_for_refund && (
            <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Progress to eligibility</span>
                <span className="text-sm text-gray-500">{status.days_active} / 7 days</span>
              </div>
              <div className="bg-surface-600 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-brand-500 to-cyan-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (status.days_active / 7) * 100)}%` }}
                />
              </div>
              {status.kit_count === 0 && (
                <p className="text-xs text-yellow-400 mt-3">
                  You need to generate at least one career kit before the 7-day clock starts.
                </p>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-6">
            <h3 className="text-base font-semibold text-white mb-4">How the Promise works</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Generate at least one Career Kit (CV, Cover Letter, or Interview Pack)' },
                { step: '2', text: 'Actively apply to jobs using your kit for 7 days' },
                { step: '3', text: 'If you haven\'t received a positive response, submit a refund request' },
                { step: '4', text: 'Our team reviews within 48 hours and refunds your credits' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-sm text-gray-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Existing request */}
          {status.existing_request && (
            <div className={`rounded-2xl border p-5 ${
              status.existing_request.status === 'resolved'
                ? 'bg-emerald-900/10 border-emerald-500/20'
                : 'bg-yellow-900/10 border-yellow-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold ${
                  status.existing_request.status === 'resolved' ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {status.existing_request.status === 'resolved' ? '✓ Request Resolved' : '⏳ Request Pending'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Request ID: <span className="font-mono text-gray-300">{status.existing_request.id.slice(0, 12)}…</span>
              </p>
              {status.existing_request.credits_refunded > 0 && (
                <p className="text-sm text-emerald-300 mt-2">
                  {status.existing_request.credits_refunded} credits have been refunded to your account.
                </p>
              )}
            </div>
          )}

          {/* Request form */}
          {status.eligible_for_refund && !status.existing_request && (
            <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-6">
              <h3 className="text-base font-semibold text-white mb-4">Submit Refund Request</h3>

              <label className="block text-sm text-gray-400 mb-2">
                Tell us what happened (optional)
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="I applied to 20 jobs over 7 days using my CareerForge kit but haven't received any positive responses…"
                className="w-full bg-surface-700 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none h-24 focus:outline-none focus:border-brand-500/50"
              />

              {error && (
                <p className="text-red-400 text-sm mt-3">{error}</p>
              )}
              {success && (
                <p className="text-emerald-400 text-sm mt-3">{success}</p>
              )}

              <button
                onClick={submitRequest}
                disabled={submitting}
                className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : null}
                Request Credit Refund
              </button>
            </div>
          )}

          {/* Not yet eligible info */}
          {!status.eligible_for_refund && (
            <div className="bg-surface-800 rounded-2xl border border-white/[0.06] p-5 text-center">
              <p className="text-sm text-gray-400">
                {status.kit_count === 0
                  ? 'Generate your first career kit to start the 7-day promise clock.'
                  : `Come back in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to claim your refund if needed.`
                }
              </p>
              {status.kit_count === 0 && (
                <a href="/dashboard/kit/new" className="btn-primary inline-block px-6 py-2 mt-4 text-sm">
                  Generate a Kit
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {error && !loading && !status && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
