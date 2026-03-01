'use client'
import Link from 'next/link'
import { useLang } from '@/lib/i18n'

const FEATURES_EN = [
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    title: 'ATS-Optimized CV',
    desc: 'Tailored to every job description with keyword matching, gap analysis, and ATS formatting.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    title: 'Cover Letter',
    desc: 'Personalized, compelling letters that articulate your unique value to hiring managers.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    title: 'Interview Prep',
    desc: 'Role-specific STAR stories, behavioral questions, and technical topics to study.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    title: 'Outreach Sequences',
    desc: 'LinkedIn messages, cold emails, and follow-ups crafted to get responses from recruiters.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    title: 'ATS Score Analysis',
    desc: 'Instant keyword matching score and actionable recommendations before you apply.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    title: 'Verified Identity',
    desc: 'Blockchain-attested credentials via Thronos VerifyID to stand out with verified claims.',
  },
]

const FEATURES_EL = [
  { ...FEATURES_EN[0], title: 'ATS-Βελτιστοποιημένο CV', desc: 'Προσαρμοσμένο σε κάθε αγγελία με αντιστοίχιση λέξεων-κλειδιών και μορφοποίηση ATS.' },
  { ...FEATURES_EN[1], title: 'Συνοδευτική Επιστολή', desc: 'Εξατομικευμένες επιστολές που εκφράζουν τη μοναδική σου αξία στους hiring managers.' },
  { ...FEATURES_EN[2], title: 'Προετοιμασία Συνέντευξης', desc: 'Ερωτήσεις STAR, behavioral questions και τεχνικά θέματα για μελέτη ανά ρόλο.' },
  { ...FEATURES_EN[3], title: 'Ακολουθίες Outreach', desc: 'Μηνύματα LinkedIn, cold emails και follow-ups για να παίρνεις απαντήσεις από recruiters.' },
  { ...FEATURES_EN[4], title: 'Ανάλυση ATS Score', desc: 'Άμεσο score αντιστοίχισης λέξεων-κλειδιών και συστάσεις πριν υποβάλεις αίτηση.' },
  { ...FEATURES_EN[5], title: 'Επαληθευμένη Ταυτότητα', desc: 'Πιστοποιημένα credentials blockchain μέσω Thronos VerifyID για να ξεχωρίζεις.' },
]

const TESTIMONIALS = [
  {
    name: 'Νίκος Παπαδόπουλος',
    role: 'Software Engineer',
    location: 'Athens, GR',
    avatar: 'ΝΠ',
    quote_en: 'Got 3 interview invitations in my first week. The ATS-optimized CV made the difference — my old one was invisible to recruiters.',
    quote_el: 'Πήρα 3 καλέσματα για συνέντευξη την πρώτη εβδομάδα. Το ATS-βελτιστοποιημένο CV ήταν η διαφορά — το παλιό μου ήταν αόρατο στους recruiters.',
    stars: 5,
  },
  {
    name: 'María García',
    role: 'Marketing Manager',
    location: 'Madrid, ES',
    avatar: 'MG',
    quote_en: 'The ATS score feature is a game-changer. It showed me exactly which keywords my CV was missing — and after fixing them, I started getting callbacks.',
    quote_el: 'Το ATS score είναι επαναστατικό. Μου έδειξε ακριβώς ποιες λέξεις-κλειδιά έλειπαν — και μετά τη διόρθωση, άρχισα να παίρνω τηλέφωνα.',
    stars: 5,
  },
  {
    name: 'Lena Müller',
    role: 'Product Designer',
    location: 'Berlin, DE',
    avatar: 'LM',
    quote_en: 'The cover letters feel genuinely personal, not templated. Every hiring manager I spoke with mentioned my application stood out.',
    quote_el: 'Οι συνοδευτικές επιστολές φαίνονται πραγματικά προσωπικές, όχι τυποποιημένες. Κάθε hiring manager που μίλησα ανέφερε ότι η αίτησή μου ξεχώριζε.',
    stars: 5,
  },
]

const PACKS = [
  { name: 'Starter', credits: 30, price: '€9', desc_en: '~4 full career kits', desc_el: '~4 πλήρη career kits', pack: 'pack_30' },
  { name: 'Pro', credits: 100, price: '€24', desc_en: '~14 full career kits', desc_el: '~14 πλήρη career kits', pack: 'pack_100', popular: true },
  { name: 'Power', credits: 300, price: '€59', desc_en: '~42 full career kits', desc_el: '~42 πλήρη career kits', pack: 'pack_300' },
]

const CREDIT_TABLE_EN = [
  ['Full kit (CV + cover letter + interview + outreach)', '7 credits'],
  ['CV only', '3 credits'],
  ['Cover letter only', '2 credits'],
  ['ATS score analysis', '1 credit'],
  ['AI chat assistant', '10 credits'],
]
const CREDIT_TABLE_EL = [
  ['Πλήρες kit (CV + επιστολή + συνέντευξη + outreach)', '7 credits'],
  ['Μόνο CV', '3 credits'],
  ['Μόνο συνοδευτική επιστολή', '2 credits'],
  ['Ανάλυση ATS score', '1 credit'],
  ['AI chat assistant', '10 credits'],
]

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function LandingPage() {
  const { lang, t, toggle } = useLang()
  const features = lang === 'el' ? FEATURES_EL : FEATURES_EN
  const steps = [
    { n: '01', title: t.step1_title, desc: t.step1_desc },
    { n: '02', title: t.step2_title, desc: t.step2_desc },
    { n: '03', title: t.step3_title, desc: t.step3_desc },
  ]
  const creditTable = lang === 'el' ? CREDIT_TABLE_EL : CREDIT_TABLE_EN

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
            <a href="#features" className="hover:text-white transition-colors">{t.nav_features}</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">{t.nav_how}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t.nav_pricing}</a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button onClick={toggle}
              className="text-xs font-semibold text-gray-500 hover:text-white border border-white/[0.08] hover:border-white/20 px-2.5 py-1 rounded-lg transition-all">
              {lang === 'en' ? 'EL' : 'EN'}
            </button>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              {t.nav_signin}
            </Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">
              {t.nav_start}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-32"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(99,102,241,0.22), transparent)' }}>
        <div className="inline-flex items-center gap-2 bg-brand-950/60 border border-brand-800/50 text-brand-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          {t.hero_badge}
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.07] tracking-tight mb-7 max-w-4xl">
          {t.hero_h1a}<br />
          {t.hero_h1b} <span className="text-gradient">{t.hero_h1c}</span> {t.hero_h1d}
        </h1>

        <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
          {t.hero_sub}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-20">
          <Link href="/register" className="btn-primary px-8 py-3.5 text-base">
            {t.hero_cta}
          </Link>
          <Link href="/login" className="btn-ghost px-8 py-3.5 text-base">
            {t.hero_signin}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-10">
          {[
            ['10 000+', t.stat_cvs],
            ['95%', t.stat_ats],
            ['< 30s', t.stat_time],
            ['4', t.stat_tools],
          ].map(([n, l]) => (
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
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">{t.feat_title}</p>
            <h2 className="text-4xl font-bold">{t.feat_sub}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
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
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">{t.steps_title}</p>
            <h2 className="text-4xl font-bold">{t.steps_sub}</h2>
          </div>
          <div className="space-y-5">
            {steps.map(s => (
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

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">{t.test_title}</p>
            <h2 className="text-4xl font-bold">{t.test_sub}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(tm => (
              <div key={tm.name} className="card p-6 flex flex-col">
                <StarRow n={tm.stars} />
                <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-5">
                  &ldquo;{lang === 'el' ? tm.quote_el : tm.quote_en}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className="w-9 h-9 rounded-full bg-brand-950/80 border border-brand-800/40 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
                    {tm.avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{tm.name}</p>
                    <p className="text-gray-500 text-xs">{tm.role} · {tm.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Live hired ticker */}
          <div className="mt-10 flex items-center justify-center gap-2.5 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>
              {lang === 'el'
                ? 'Ένας χρήστης μόλις πήρε προσφορά εργασίας πριν από 12 λεπτά'
                : 'A user just received a job offer 12 minutes ago'}
            </span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'rgba(99,102,241,0.04)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">{t.price_title}</p>
            <h2 className="text-4xl font-bold mb-3">{t.price_sub}</h2>
            <p className="text-gray-400">{t.price_desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {PACKS.map(p => (
              <div key={p.pack} className={`card p-7 flex flex-col ${p.popular ? 'border-brand-600/50 ring-1 ring-brand-600/20' : ''}`}>
                {p.popular && <div className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">{t.price_popular}</div>}
                <div className="text-3xl font-extrabold text-white mb-1">{p.price}</div>
                <div className="text-brand-300 font-semibold text-lg mb-1">{p.credits} credits</div>
                <div className="text-gray-500 text-sm mb-6 flex-1">{lang === 'el' ? p.desc_el : p.desc_en}</div>
                <Link href="/register"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${p.popular ? 'btn-primary' : 'btn-ghost'}`}>
                  {t.price_action}
                </Link>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-4 font-semibold">{t.price_table_title}</p>
            <div className="divide-y divide-white/[0.05]">
              {creditTable.map(([a, c]) => (
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
        <h2 className="text-4xl md:text-5xl font-extrabold mb-5">{t.cta_h}</h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">{t.cta_sub}</p>
        <Link href="/register" className="btn-primary px-10 py-4 text-base inline-block">
          {t.cta_btn}
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold">
            <span className="text-gradient">Career</span><span className="text-white">Forge</span>
          </span>
          <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} CareerForge &middot; {t.footer_copy}</p>
          <div className="flex gap-5 text-sm text-gray-600">
            <Link href="/login" className="hover:text-gray-400 transition-colors">{t.nav_signin}</Link>
            <Link href="/register" className="hover:text-gray-400 transition-colors">{t.nav_start}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
