'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { saveToken } from '@/lib/auth'

interface Props { mode: 'login' | 'register' }

export default function AuthForm({ mode }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'register'
        ? await api.register(email, password, fullName)
        : await api.login(email, password)
      saveToken(res.token)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.18), transparent)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-extrabold tracking-tight">
            <span className="text-gradient">Career</span>
            <span className="text-white">Forge</span>
          </Link>
          <p className="text-gray-400 mt-2 text-sm">
            {mode === 'login' ? 'Welcome back — sign in to your account' : 'Create your account and start applying smarter'}
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl shadow-black/40">
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="input"
                  placeholder="Jane Doe" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'} />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-2.5">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Link href={mode === 'login' ? '/register' : '/login'}
              className="text-brand-400 hover:text-brand-300 transition-colors font-medium">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-700 text-xs mt-5">
          <Link href="/" className="hover:text-gray-500 transition-colors">&larr; Back to home</Link>
        </p>
      </div>
    </div>
  )
}
