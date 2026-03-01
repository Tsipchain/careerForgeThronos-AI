'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'en' | 'el'

const T = {
  en: {
    // Nav
    nav_features: 'Features',
    nav_how: 'How it works',
    nav_pricing: 'Pricing',
    nav_signin: 'Sign in',
    nav_start: 'Get started free',
    // Hero
    hero_badge: 'Powered by Thronos AI · Blockchain-attested credentials',
    hero_h1a: 'Land your next job',
    hero_h1b: 'with',
    hero_h1c: 'AI-crafted',
    hero_h1d: 'tools',
    hero_sub: 'Generate ATS-optimized CVs, tailored cover letters, interview prep guides, and recruiter outreach sequences — all from one job description, in seconds.',
    hero_cta: 'Start free — no card required',
    hero_signin: 'Sign in',
    stat_cvs: 'CVs generated',
    stat_ats: 'ATS pass rate',
    stat_time: 'per full kit',
    stat_tools: 'in one click',
    // Features
    feat_title: 'Everything you need',
    feat_sub: 'One platform, full job-search arsenal',
    // Steps
    steps_title: 'Simple by design',
    steps_sub: 'From job posting to full kit in 3 steps',
    step1_title: 'Paste the job description',
    step1_desc: 'Copy any job posting and paste it into CareerForge — from any platform.',
    step2_title: 'Add your experience',
    step2_desc: 'Optionally paste your existing CV to personalize all outputs to your background.',
    step3_title: 'Get your full kit in seconds',
    step3_desc: 'AI generates a complete application kit: CV, cover letter, interview prep, and outreach.',
    // Testimonials
    test_title: 'Trusted by job seekers across Europe',
    test_sub: 'Real results from real professionals',
    // Pricing
    price_title: 'Transparent pricing',
    price_sub: 'Pay once, use whenever',
    price_desc: 'No subscriptions. Buy credits and spend them at your own pace.',
    price_popular: 'Most popular',
    price_action: 'Get started',
    price_table_title: 'Credit cost per action',
    // CTA
    cta_h: 'Ready to land your next role?',
    cta_sub: 'Join thousands of job seekers who use CareerForge to stand out in competitive markets.',
    cta_btn: 'Create free account',
    // Footer
    footer_copy: 'Powered by Thronos · All rights reserved',
    // Dashboard nav
    dash_overview: 'Overview',
    dash_newkit: 'New Kit',
    dash_kits: 'My Kits',
    dash_profile: 'Profile',
    dash_credits: 'Credits',
    dash_signout: 'Sign out',
    dash_generate: 'Generate Kit',
  },
  el: {
    // Nav
    nav_features: 'Δυνατότητες',
    nav_how: 'Πώς λειτουργεί',
    nav_pricing: 'Τιμολόγηση',
    nav_signin: 'Σύνδεση',
    nav_start: 'Ξεκίνα δωρεάν',
    // Hero
    hero_badge: 'Με τεχνολογία Thronos AI · Πιστοποιημένα credentials blockchain',
    hero_h1a: 'Βρες την επόμενη',
    hero_h1b: 'δουλειά σου με',
    hero_h1c: 'AI εργαλεία',
    hero_h1d: '',
    hero_sub: 'Δημιούργησε ATS-βελτιστοποιημένα CV, προσωπικές συνοδευτικές επιστολές, οδηγούς προετοιμασίας συνέντευξης και μηνύματα outreach — από μία αγγελία, σε δευτερόλεπτα.',
    hero_cta: 'Ξεκίνα δωρεάν — χωρίς κάρτα',
    hero_signin: 'Σύνδεση',
    stat_cvs: 'CV δημιουργήθηκαν',
    stat_ats: 'Ποσοστό επιτυχίας ATS',
    stat_time: 'ανά πλήρες kit',
    stat_tools: 'εργαλεία με ένα κλικ',
    // Features
    feat_title: 'Όλα όσα χρειάζεσαι',
    feat_sub: 'Μία πλατφόρμα, πλήρης οπλοστάσιο αναζήτησης εργασίας',
    // Steps
    steps_title: 'Απλό στη χρήση',
    steps_sub: 'Από αγγελία σε πλήρες kit σε 3 βήματα',
    step1_title: 'Επικόλλησε την αγγελία',
    step1_desc: 'Αντέγραψε οποιαδήποτε αγγελία εργασίας και επικόλλησε την στο CareerForge — από οποιαδήποτε πλατφόρμα.',
    step2_title: 'Πρόσθεσε την εμπειρία σου',
    step2_desc: 'Προαιρετικά, επικόλλησε το υπάρχον CV σου για να εξατομικευτούν τα αποτελέσματα.',
    step3_title: 'Πάρε το πλήρες kit σε δευτερόλεπτα',
    step3_desc: 'Η AI δημιουργεί ένα πλήρες πακέτο αίτησης: CV, συνοδευτική επιστολή, προετοιμασία συνέντευξης και outreach.',
    // Testimonials
    test_title: 'Εμπιστοσύνη από επαγγελματίες σε όλη την Ευρώπη',
    test_sub: 'Πραγματικά αποτελέσματα από πραγματικούς επαγγελματίες',
    // Pricing
    price_title: 'Διαφανής τιμολόγηση',
    price_sub: 'Αγόρασε μία φορά, χρησιμοποίησε όποτε θέλεις',
    price_desc: 'Χωρίς συνδρομές. Αγόρασε credits και ξόδεψε τα με το δικό σου ρυθμό.',
    price_popular: 'Πιο δημοφιλές',
    price_action: 'Ξεκίνα',
    price_table_title: 'Κόστος credits ανά ενέργεια',
    // CTA
    cta_h: 'Έτοιμος για το επόμενο ρόλο;',
    cta_sub: 'Γίνε μέλος χιλιάδων επαγγελματιών που χρησιμοποιούν το CareerForge για να ξεχωρίσουν.',
    cta_btn: 'Δημιούργησε δωρεάν λογαριασμό',
    // Footer
    footer_copy: 'Powered by Thronos · Με επιφύλαξη παντός δικαιώματος',
    // Dashboard nav
    dash_overview: 'Επισκόπηση',
    dash_newkit: 'Νέο Kit',
    dash_kits: 'Τα Kits μου',
    dash_profile: 'Προφίλ',
    dash_credits: 'Credits',
    dash_signout: 'Αποσύνδεση',
    dash_generate: 'Δημιουργία Kit',
  },
}

type Translations = typeof T['en']

const LangContext = createContext<{
  lang: Lang
  t: Translations
  toggle: () => void
}>({ lang: 'en', t: T.en, toggle: () => {} })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('cf_lang') as Lang | null
    if (saved === 'en' || saved === 'el') setLang(saved)
  }, [])

  function toggle() {
    const next: Lang = lang === 'en' ? 'el' : 'en'
    setLang(next)
    localStorage.setItem('cf_lang', next)
  }

  return (
    <LangContext.Provider value={{ lang, t: T[lang], toggle }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
