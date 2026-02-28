'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const PACKS = [
  { key: 'pack_30',  credits: 30,  price: '€9',  label: 'Starter', desc: '~4 full kits' },
  { key: 'pack_100', credits: 100, price: '€24', label: 'Pro',     desc: '~14 full kits', popular: true },
  { key: 'pack_300', credits: 300, price: '€59', label: 'Power',   desc: '~42 full kits' },
]

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => { api.balance().then(r => setBalance(r.balance)).catch(() => {}) }, [])

  async function buy(pack: string) {
    setLoading(pack)
    try {
      const { checkout_url } = await api.checkout(pack)
      window.location.href = checkout_url
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error')
      setLoading(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Credits</h1>
      <p className="text-gray-400 mb-2">Your current balance</p>
      <div className="text-5xl font-bold text-white mb-8">{balance ?? '…'} <span className="text-lg text-gray-400 font-normal">credits</span></div>

      <h2 className="text-lg font-semibold mb-4">Top up</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map(p => (
          <div key={p.key} className={`rounded-xl p-5 border ${p.popular ? 'border-brand-500 bg-brand-900/20' : 'border-gray-700 bg-gray-900'}`}>
            {p.popular && <div className="text-brand-400 text-xs font-semibold uppercase mb-1">Most popular</div>}
            <div className="text-2xl font-bold">{p.price}</div>
            <div className="text-brand-300 font-semibold">{p.credits} credits</div>
            <div className="text-gray-500 text-xs mt-1 mb-4">{p.desc}</div>
            <button onClick={() => buy(p.key)} disabled={loading === p.key}
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${p.popular ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'border border-gray-600 hover:border-gray-400 text-gray-300'}`}>
              {loading === p.key ? 'Loading…' : 'Buy'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-3">Credit cost per action</h3>
        <table className="w-full text-sm text-gray-400">
          <tbody className="divide-y divide-gray-800">
            {[['Full kit (CV + cover + interview + outreach)', '7'], ['CV only', '3'], ['Cover letter only', '2'], ['ATS score', '1'], ['AI assistant', '10']].map(([label, cost]) => (
              <tr key={label}><td className="py-2">{label}</td><td className="py-2 text-right text-white font-medium">{cost} credits</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
