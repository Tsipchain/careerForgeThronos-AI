import Link from 'next/link'

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'ATS-Optimized CV',
    desc: 'Tailored to every job description with keyword matching, gap analysis, and ATS formatting.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Cover Letter',
    desc: 'Personalized, compelling letters that articulate your unique value to hiring managers.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Interview Prep',
    desc: 'Role-specific STAR stories, behavioral questions, and technical topics to study.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Outreach Sequences',
    desc: 'LinkedIn messages, cold emails, and follow-ups crafted to get responses from recruiters.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'ATS Score Analysis',
    desc: 'Instant keyword matching score and actionable recommendations before you apply.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Verified Identity',
    desc: 'Blockchain-attested credentials via Thronos VerifyID to stand out with verified claims.',
  },
]

const STEPS = [
  { n: '01', title: 'Paste the job description', desc: 'Copy any job posting and paste it into CareerForge — from any platform.' },
  { n: '02', title: 'Add your experience', desc: 'Optionally paste your existing CV to personalize all outputs to your background.' },
  { n: '03', title: 'Get your full kit in seconds', desc: 'AI generates a complete application kit: CV, cover letter, interview prep, and outreach.' },
]

const PACKS = [
  { name: 'Starter', credits: 30, price: '€9', desc: '~4 full career kits', pack: 'pack_30' },
  { name: 'Pro', credits: 100, price: '€24', desc: '~14 full career kits', pack: 'pack_100', popular: true },
  { name: 'Power', credits: 300, price: '€59', desc: '~42 full career kits', pack: 'pack_300' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-surface-900/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-gradient">Career</span>
            <span className="text-white">Forge</span>
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-32"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(99,102,241,0.22), transparent)' }}>
        <div className="inline-flex items-center gap-2 bg-brand-950/60 border border-brand-800/50 text-brand-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Powered by Thronos AI &middot; Blockchain-attested credentials
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.07] tracking-tight mb-7 max-w-4xl">
          Land your next job<br />
          with <span className="text-gradient">AI-crafted</span> tools
        </h1>

        <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
          Generate ATS-optimized CVs, tailored cover letters, interview prep guides,
          and recruiter outreach sequences — all from one job description, in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-20">
          <Link href="/register" className="btn-primary px-8 py-3.5 text-base">
            Start free — no card required
          </Link>
          <Link href="/login" className="btn-ghost px-8 py-3.5 text-base">
            Sign in
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-10">
          {[['10 000+', 'CVs generated'], ['95%', 'ATS pass rate'], ['< 30s', 'per full kit'], ['4 tools', 'in one click']].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-bold text-white">{n}</div>
              <div className="text-xs text-gray-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-4xl font-bold">One platform, full job-search arsenal</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 hover:border-brand-800/60 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-brand-950/80 border border-brand-800/40 flex items-center justify-center text-brand-400 mb-5 group-hover:border-brand-600/50 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: 'rgba(99,102,241,0.04)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="text-4xl font-bold">From job posting to full kit in 3 steps</h2>
          </div>
          <div className="space-y-5">
            {STEPS.map(s => (
              <div key={s.n} className="card p-6 flex gap-6 items-start">
                <div className="text-4xl font-extrabold text-gradient opacity-50 leading-none tabular-nums min-w-[3rem]">{s.n}</div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Transparent pricing</p>
            <h2 className="text-4xl font-bold mb-3">Pay once, use whenever</h2>
            <p className="text-gray-400">No subscriptions. Buy credits and spend them at your own pace.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {PACKS.map(p => (
              <div key={p.pack} className={`card p-7 flex flex-col ${p.popular ? 'border-brand-600/50 ring-1 ring-brand-600/20' : ''}`}>
                {p.popular && <div className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">Most popular</div>}
                <div className="text-3xl font-extrabold text-white mb-1">{p.price}</div>
                <div className="text-brand-300 font-semibold text-lg mb-1">{p.credits} credits</div>
                <div className="text-gray-500 text-sm mb-6 flex-1">{p.desc}</div>
                <Link href="/register"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${p.popular ? 'btn-primary' : 'btn-ghost'}`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-4 font-semibold">Credit cost per action</p>
            <div className="divide-y divide-white/[0.05]">
              {[['Full kit (CV + cover letter + interview + outreach)', '7 credits'], ['CV only', '3 credits'], ['Cover letter only', '2 credits'], ['ATS score analysis', '1 credit'], ['AI chat assistant', '10 credits']].map(([a, c]) => (
                <div key={a} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-gray-400">{a}</span>
                  <span className="text-white font-medium">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center" style={{ backgroundImage: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(99,102,241,0.15), transparent)' }}>
        <h2 className="text-4xl md:text-5xl font-extrabold mb-5">Ready to land your next role?</h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">Join thousands of job seekers who use CareerForge to stand out in competitive markets.</p>
        <Link href="/register" className="btn-primary px-10 py-4 text-base inline-block">
          Create free account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold">
            <span className="text-gradient">Career</span><span className="text-white">Forge</span>
          </span>
          <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} CareerForge &middot; Powered by Thronos &middot; All rights reserved</p>
          <div className="flex gap-5 text-sm text-gray-600">
            <Link href="/login" className="hover:text-gray-400 transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-gray-400 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
