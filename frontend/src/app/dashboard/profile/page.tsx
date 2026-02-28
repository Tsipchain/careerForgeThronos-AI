'use client'
import { useEffect, useState, FormEvent } from 'react'
import { api } from '@/lib/api'

interface Profile {
  profile_version: number
  identity: { full_name: string; email?: string; phone?: string; location?: string; linkedin_url?: string }
  headline: string
  skills: { hard: string[]; soft?: string[] }
  experience: Array<{ company: string; role: string; start: string; end?: string; bullets: string[] }>
}

const empty: Profile = {
  profile_version: 1,
  identity: { full_name: '', email: '', location: '' },
  headline: '',
  skills: { hard: [] },
  experience: [],
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty)
  const [hardSkills, setHardSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api.getProfile().then((r: unknown) => {
      const p = (r as { data?: Profile })?.data
      if (p) {
        setProfile(p)
        setHardSkills((p.skills?.hard || []).join(', '))
      }
    }).catch(() => {}).finally(() => setFetching(false))
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    try {
      const updated = { ...profile, skills: { ...profile.skills, hard: hardSkills.split(',').map(s => s.trim()).filter(Boolean) } }
      await api.upsertProfile(updated)
      setSaved(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Career Profile</h1>
      <form onSubmit={save} className="space-y-6">
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-200">Identity</h2>
          {(['full_name', 'email', 'location', 'linkedin_url'] as const).map(k => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-1 capitalize">{k.replace('_', ' ')}</label>
              <input value={(profile.identity as Record<string, string>)[k] || ''} onChange={e => setProfile(p => ({ ...p, identity: { ...p.identity, [k]: e.target.value } }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
            </div>
          ))}
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-200">Headline & Skills</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Headline</label>
            <input value={profile.headline} onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              placeholder="Senior Full-Stack Engineer · Python · React" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Technical skills <span className="text-gray-600">(comma-separated)</span></label>
            <input value={hardSkills} onChange={e => setHardSkills(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              placeholder="Python, React, PostgreSQL, Docker, AWS" />
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors text-sm">
            {loading ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span className="text-green-400 text-sm">✓ Saved</span>}
        </div>
      </form>
    </div>
  )
}
