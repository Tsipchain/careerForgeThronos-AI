'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'

type Step = 'kyc' | 'profile' | 'done'

// ── Step indicator ──────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = [
    { id: 'kyc', label: 'Verify identity' },
    { id: 'profile', label: 'Career profile' },
    { id: 'done', label: 'Claim bonus' },
  ] as const
  const idx = steps.findIndex(s => s.id === step)
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            i < idx ? 'text-green-400' : i === idx ? 'text-brand-300 bg-brand-900/40 border border-brand-700/40' : 'text-gray-600'
          }`}>
            {i < idx
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              : <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${i === idx ? 'border-brand-500 text-brand-400' : 'border-gray-700 text-gray-600'}`}>{i + 1}</span>
            }
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mx-1 ${i < idx ? 'bg-green-800' : 'bg-gray-800'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── KYC Step ────────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = ['passport', 'national_id', 'drivers_license']

function KycStep({ onDone }: { onDone: () => void }) {
  const [docType, setDocType] = useState('passport')
  const [fullName, setFullName] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [dob, setDob] = useState('')
  const [nationality, setNationality] = useState('')
  const [frontImg, setFrontImg] = useState<string | null>(null)
  const [backImg, setBackImg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationId, setVerificationId] = useState<number | null>(null)
  const [kycStatus, setKycStatus] = useState<string>('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res((r.result as string).split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) {
    const file = e.target.files?.[0]
    if (file) setter(await toBase64(file))
  }

  async function submit() {
    if (!fullName || !docNumber || !dob || !nationality || !frontImg) {
      setError('Please fill all required fields and upload the front of your document.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.kycSubmit({
        document_type: docType,
        full_name: fullName,
        document_number: docNumber,
        date_of_birth: dob,
        nationality,
        front_image: frontImg,
        back_image: backImg ?? undefined,
      })
      setVerificationId(res.verification_id)
      setKycStatus('pending')
      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.kycPoll(res.verification_id)
          setKycStatus(s.status)
          if (s.status === 'completed' || s.status === 'approved') {
            clearInterval(pollRef.current!)
            onDone()
          } else if (s.status === 'rejected') {
            clearInterval(pollRef.current!)
            setError('Document rejected. Please try again with a clearer photo.')
            setVerificationId(null)
          }
        } catch { /* ignore poll errors */ }
      }, 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  if (verificationId && kycStatus !== 'rejected') {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-brand-950/60 border border-brand-700/40 flex items-center justify-center mx-auto mb-5">
          <svg className="animate-spin w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Verifying your documents</h2>
        <p className="text-gray-400 text-sm mb-1">Our AI is reviewing your submission. This usually takes under 30 seconds.</p>
        <p className="text-gray-600 text-xs">Status: <span className="text-brand-400 font-medium">{kycStatus}</span></p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white mb-1">Verify your identity</h2>
      <p className="text-gray-400 text-sm mb-6">
        Upload a government-issued ID. After successful verification you'll receive <span className="text-brand-300 font-semibold">30 free credits</span> — enough for 4 full career kits.
      </p>

      <div className="space-y-4">
        {/* Document type */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Document type</label>
          <div className="flex gap-2">
            {DOCUMENT_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setDocType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${docType === t ? 'border-brand-500 bg-brand-900/40 text-brand-300' : 'border-white/10 text-gray-500 hover:border-white/20'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Full name (as on document) *</label>
            <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Maria Doe" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Document number *</label>
            <input className="input" value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="AB123456" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Date of birth *</label>
            <input className="input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nationality *</label>
            <input className="input" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Greek" />
          </div>
        </div>

        {/* File uploads */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Front of document *', key: 'front', setter: setFrontImg, val: frontImg },
            { label: 'Back of document', key: 'back', setter: setBackImg, val: backImg },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
              <label className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${f.val ? 'border-green-700/60 bg-green-950/20' : 'border-white/10 hover:border-brand-700/40'}`}>
                {f.val
                  ? <span className="text-green-400 text-xs font-medium">✓ Uploaded</span>
                  : <>
                      <svg className="w-6 h-6 text-gray-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="text-gray-600 text-xs">Upload photo</span>
                    </>
                }
                <input type="file" className="hidden" accept="image/*" onChange={e => handleFile(e, f.setter)} />
              </label>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button onClick={submit} disabled={loading}
          className="btn-primary w-full py-3 text-sm">
          {loading ? 'Submitting…' : 'Submit for verification'}
        </button>

        <p className="text-center text-gray-600 text-xs">
          Your documents are processed securely and never stored in plain text. Powered by Thronos AI.
        </p>
      </div>
    </div>
  )
}

// ── Profile Step ────────────────────────────────────────────────────────────
function ProfileStep({ onDone }: { onDone: () => void }) {
  const [fullName, setFullName] = useState('')
  const [headline, setHeadline] = useState('')
  const [skills, setSkills] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [start, setStart] = useState('')
  const [bullets, setBullets] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!fullName || !headline || !skills || !company || !role || !start) {
      setError('Please fill all required fields.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.upsertProfile({
        profile_version: 1,
        identity: { full_name: fullName },
        headline,
        skills: { hard: skills.split(',').map(s => s.trim()).filter(Boolean) },
        experience: [{
          company,
          role,
          start,
          bullets: bullets.split('\n').map(b => b.trim()).filter(Boolean),
        }],
      })
      onDone()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white mb-1">Build your career profile</h2>
      <p className="text-gray-400 text-sm mb-6">
        This profile powers all your AI-generated kits. You can always update it later.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Full name *</label>
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Professional headline *</label>
          <input className="input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Senior Software Engineer · Python · React" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Technical skills * <span className="text-gray-600">(comma-separated)</span></label>
          <input className="input" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Python, React, PostgreSQL, Docker, AWS" />
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Most recent experience *</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Company</label>
              <input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Software Engineer" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start date</label>
            <input className="input" type="month" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Key achievements <span className="text-gray-600">(one per line)</span></label>
            <textarea className="input resize-none" rows={3} value={bullets} onChange={e => setBullets(e.target.value)}
              placeholder={"Increased API throughput by 40%\nLed team of 5 engineers\nDeployed to 3 regions"} />
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button onClick={save} disabled={loading} className="btn-primary w-full py-3 text-sm">
          {loading ? 'Saving…' : 'Save profile & continue'}
        </button>
      </div>
    </div>
  )
}

// ── Done Step ───────────────────────────────────────────────────────────────
function DoneStep({ balance }: { balance: number }) {
  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-950/40 border border-green-700/40 flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold text-white mb-3">You're all set!</h2>
      <p className="text-gray-400 mb-2">Your identity is verified and your profile is ready.</p>
      <div className="inline-flex items-center gap-2 bg-brand-950/60 border border-brand-700/40 px-4 py-2 rounded-full mb-8">
        <span className="text-brand-300 font-bold text-lg">{balance}</span>
        <span className="text-brand-400 text-sm">credits credited to your account</span>
      </div>
      <div className="space-y-3">
        <Link href="/dashboard/kit/new"
          className="btn-primary block w-full py-3.5 text-base">
          Generate your first career kit →
        </Link>
        <Link href="/dashboard" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('kyc')
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return }
    // If already KYC-verified, skip to profile
    api.kycStatus().then(s => {
      setBalance(s.balance)
      if (s.bonus_received) { setStep('done'); return }
      if (s.verified) setStep('profile')
    }).catch(() => {})
  }, [router])

  function onKycDone() {
    // Fetch latest balance (bonus may have been granted via webhook)
    api.kycStatus().then(s => setBalance(s.balance)).catch(() => {})
    setStep('profile')
  }

  function onProfileDone() {
    api.kycStatus().then(s => setBalance(s.balance)).catch(() => {})
    setStep('done')
  }

  return (
    <div className="min-h-screen px-6 py-12"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.15), transparent)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-gradient">Career</span>
            <span className="text-white">Forge</span>
          </Link>
          <p className="text-gray-500 text-sm mt-1">Set up your account in 3 quick steps</p>
        </div>

        <StepBar step={step} />

        <div className="card p-8">
          {step === 'kyc' && <KycStep onDone={onKycDone} />}
          {step === 'profile' && <ProfileStep onDone={onProfileDone} />}
          {step === 'done' && <DoneStep balance={balance} />}
        </div>
      </div>
    </div>
  )
}
