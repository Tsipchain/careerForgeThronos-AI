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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-brand-500">CareerForge</Link>
          <p className="text-gray-400 mt-2">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        </div>
        <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                placeholder="John Doe" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
              placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition-colors">
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <p className="text-center text-gray-500 text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Link href={mode === 'login' ? '/register' : '/login'} className="text-brand-400 hover:underline">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
