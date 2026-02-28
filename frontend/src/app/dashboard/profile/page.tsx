'use client'
import { useEffect, useState, FormEvent } from 'react'
import { api } from '@/lib/api'

interface Experience {
  company: string
  role: string
  start: string
  end?: string
  bullets: string[]
}

interface Profile {
  profile_version: number
  identity: { full_name: string; email?: string; phone?: string; location?: string; linkedin_url?: string }
  headline: string
  skills: { hard: string[]; soft?: string[] }
  experience: Experience[]
}

const empty: Profile = {
  profile_version: 1,
  identity: { full_name: '', email: '', location: '' },
  headline: '',
  skills: { hard: [] },
  experience: [],
}

const IDENTITY_FIELDS: { key: keyof Profile['identity']; label: string; placeholder: string }[] = [
  { key: 'full_name',    label: 'Full name',     placeholder: 'Jane Doe' },
  { key: 'email',        label: 'Email',          placeholder: 'jane@example.com' },
  { key: 'phone',        label: 'Phone',          placeholder: '+30 69x xxx xxxx' },
  { key: 'location',     label: 'Location',       placeholder: 'Athens, Greece' },
  { key: 'linkedin_url', label: 'LinkedIn URL',   placeholder: 'https://linkedin.com/in/…' },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty)
  const [hardSkills, setHardSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getProfile().then((r: unknown) => {
      const p = (r as { data?: Profile })?.data
      if (p) {
        setProfile(p)
        setHardSkills((p.skills?.hard || []).join(', '))
      }
    }).catch(() => {}).finally(() => setFetching(false))
  }, [])

  function setIdentity(key: keyof Profile['identity'], val: string) {
    setProfile(p => ({ ...p, identity: { ...p.identity, [key]: val } }))
  }

  function setExp(idx: number, key: keyof Experience, val: string) {
    setProfile(p => {
      const exp = [...p.experience]
      exp[idx] = { ...exp[idx], [key]: key === 'bullets' ? val.split('\n').map(b => b.trim()).filter(Boolean) : val }
      return { ...p, experience: exp }
    })
  }

  function addExp() {
    setProfile(p => ({
      ...p,
      experience: [...p.experience, { company: '', role: '', start: '', bullets: [] }],
    }))
  }

  function removeExp(idx: number) {
    setProfile(p => ({ ...p, experience: p.experience.filter((_, i) => i !== idx) }))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError('')
    try {
      const updated: Profile = {
        ...profile,
        skills: { ...profile.skills, hard: hardSkills.split(',').map(s => s.trim()).filter(Boolean) },
      }
      await api.upsertProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading profile…
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Career profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">This data powers all your AI-generated kits.</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        {/* Identity */}
        <section className="card p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IDENTITY_FIELDS.map(f => (
              <div key={f.key} className={f.key === 'full_name' || f.key === 'linkedin_url' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input
                  value={(profile.identity as Record<string, string>)[f.key] || ''}
                  onChange={e => setIdentity(f.key, e.target.value)}
                  className="input"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Headline & skills */}
        <section className="card p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Headline & skills</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Professional headline *</label>
              <input
                value={profile.headline}
                onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))}
                className="input"
                placeholder="Senior Full-Stack Engineer · Python · React"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Technical skills * <span className="text-gray-600">(comma-separated)</span>
              </label>
              <input
                value={hardSkills}
                onChange={e => setHardSkills(e.target.value)}
                className="input"
                placeholder="Python, React, PostgreSQL, Docker, AWS, TypeScript"
              />
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Experience</h2>
            <button type="button" onClick={addExp}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add role
            </button>
          </div>

          {profile.experience.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">No experience added yet.</p>
          )}

          <div className="space-y-4">
            {profile.experience.map((exp, i) => (
              <div key={i} className="bg-surface-700 border border-white/[0.05] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400">Role {i + 1}</p>
                  <button type="button" onClick={() => removeExp(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Company</label>
                    <input className="input" value={exp.company} onChange={e => setExp(i, 'company', e.target.value)} placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Role</label>
                    <input className="input" value={exp.role} onChange={e => setExp(i, 'role', e.target.value)} placeholder="Software Engineer" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <input className="input" type="month" value={exp.start} onChange={e => setExp(i, 'start', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End <span className="text-gray-600">(blank = present)</span></label>
                    <input className="input" type="month" value={exp.end || ''} onChange={e => setExp(i, 'end', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Key achievements <span className="text-gray-600">(one per line)</span></label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={(exp.bullets || []).join('\n')}
                    onChange={e => setExp(i, 'bullets', e.target.value)}
                    placeholder={"Increased throughput by 40%\nLed migration to microservices\nMentored 3 junior engineers"}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading} className="btn-primary px-7 py-2.5 text-sm">
            {loading ? 'Saving…' : 'Save profile'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
