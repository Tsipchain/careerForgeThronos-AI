import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-500">CareerForge</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Log in</Link>
          <Link href="/register" className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-brand-900/40 border border-brand-700/40 text-brand-300 text-sm px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
          Powered by Thronos AI
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl">
          Land your next job with
          <span className="text-brand-500"> AI-crafted</span> career tools
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-xl">
          Generate ATS-optimized CVs, tailored cover letters, interview prep guides,
          and outreach sequences — all in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/register" className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Start for free
          </Link>
          <Link href="/login" className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-lg font-semibold transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '📄', title: 'ATS-Optimized CV', desc: 'Tailored to each job description with keyword matching and formatting checks.' },
            { icon: '✉️', title: 'Cover Letter', desc: 'Personalized, compelling cover letters that stand out from the crowd.' },
            { icon: '🎯', title: 'Interview Prep', desc: 'STAR stories, behavioral questions, and technical topics specific to your role.' },
          ].map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Credit packs */}
      <section className="py-16 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Simple credit pricing</h2>
          <p className="text-gray-400">Buy credits, use them whenever you need. No subscriptions required.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Starter', credits: 30, price: '€9', desc: 'Perfect for 4 full career kits', pack: 'pack_30' },
            { name: 'Pro', credits: 100, price: '€24', desc: 'Best value for active job seekers', pack: 'pack_100', popular: true },
            { name: 'Power', credits: 300, price: '€59', desc: 'For teams or intensive searches', pack: 'pack_300' },
          ].map(p => (
            <div key={p.pack} className={`rounded-xl p-6 border ${p.popular ? 'border-brand-500 bg-brand-900/20' : 'border-gray-700 bg-gray-900'}`}>
              {p.popular && <div className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2">Most popular</div>}
              <div className="text-2xl font-bold mb-1">{p.price}</div>
              <div className="text-gray-400 text-sm mb-1">{p.credits} credits</div>
              <div className="text-gray-500 text-xs mb-5">{p.desc}</div>
              <Link href="/register" className={`block text-center py-2 rounded-lg text-sm font-medium transition-colors ${p.popular ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'border border-gray-600 hover:border-gray-400 text-gray-300'}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-800 py-6 px-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} CareerForge · Powered by Thronos
      </footer>
    </main>
  )
}
