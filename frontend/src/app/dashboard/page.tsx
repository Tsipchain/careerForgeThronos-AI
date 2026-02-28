'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function DashboardHome() {
  const [balance, setBalance] = useState<number | null>(null)
  const [user, setUser] = useState<{ email: string; full_name: string; verifyid_verified: boolean } | null>(null)
  const [kits, setKits] = useState<unknown[]>([])

  useEffect(() => {
    api.balance().then(r => setBalance(r.balance)).catch(() => {})
    api.me().then(r => setUser(r)).catch(() => {})
    api.listKits().then(r => setKits(r.kits || [])).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome{user?.full_name ? `, ${user.full_name}` : ''} 👋</h1>
        <p className="text-gray-400 mt-1">{user?.email}</p>
        {user?.verifyid_verified && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-green-400 bg-green-900/30 border border-green-700/40 px-2.5 py-1 rounded-full">
            ✓ KYC Verified
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Credit balance</p>
          <p className="text-3xl font-bold mt-1">{balance ?? '…'}</p>
          <Link href="/dashboard/credits" className="text-brand-400 text-xs mt-2 inline-block hover:underline">Top up →</Link>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Kits generated</p>
          <p className="text-3xl font-bold mt-1">{kits.length}</p>
        </div>
        <div className="bg-brand-900/30 border border-brand-700/40 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-brand-300 text-sm font-medium">Generate a new kit</p>
          <Link href="/dashboard/kit/new" className="mt-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors text-center">
            Start now →
          </Link>
        </div>
      </div>

      {/* Recent kits */}
      {kits.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent kits</h2>
          <div className="space-y-2">
            {(kits as Array<{ id: string; kind: string; created_at: number; credits_charged: number }>).slice(0, 5).map(k => (
              <div key={k.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium capitalize">{k.kind.replace('_', ' ')} kit</span>
                  <span className="ml-3 text-xs text-gray-500">{new Date(k.created_at * 1000).toLocaleDateString()}</span>
                </div>
                <span className="text-xs text-gray-500">{k.credits_charged} credits</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
