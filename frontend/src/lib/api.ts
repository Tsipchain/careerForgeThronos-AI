const BASE = process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cf_token') || ''
}

/** Upload a PDF file and return extracted CV text. */
export async function parseCvPdf(file: File): Promise<{ text: string; pages: number; word_count: number }> {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/v1/profile/parse-cv`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.detail || `HTTP ${res.status}`)
  return data as T
}

export const api = {
  // Auth
  register: (email: string, password: string, full_name: string) =>
    req<{ token: string; sub: string; email: string }>('POST', '/v1/auth/register', { email, password, full_name }),
  login: (email: string, password: string) =>
    req<{ token: string; sub: string; email: string }>('POST', '/v1/auth/login', { email, password }),
  me: () => req<{ sub: string; email: string; full_name: string; verifyid_verified: boolean }>('GET', '/v1/auth/me'),

  // Credits
  balance: () => req<{ balance: number }>('GET', '/v1/credits/balance'),
  checkout: (pack: string) => req<{ checkout_url: string }>('POST', '/v1/credits/checkout-session', { pack }),

  // Profile
  getProfile: () => req<{ data: unknown }>('GET', '/v1/profile'),
  upsertProfile: (data: unknown) => req<unknown>('POST', '/v1/profile/upsert', { profile: data }),

  // KYC
  kycSubmit: (payload: unknown) =>
    req<{ verification_id: number; status: string }>('POST', '/v1/kyc/submit', payload),
  kycStatus: () =>
    req<{ verified: boolean; bonus_received: boolean; balance: number }>('GET', '/v1/kyc/status'),
  kycPoll: (verificationId: number) =>
    req<{ verification_id: number; status: string; ai_score: number | null }>('GET', `/v1/kyc/poll/${verificationId}`),

  // Job
  parseJob: (raw_text: string, source: string = 'paste') =>
    req<{ job_id: string; parsed: unknown }>('POST', '/v1/job/parse', { source, raw_text }),

  // Kit
  generateKit: (body: unknown) => req<unknown>('POST', '/v1/kit/generate', body),
  listKits: () => req<{ kits: unknown[] }>('GET', '/v1/kit/list'),

  // ATS
  atsScore: (cv_text: string, job_id: string) =>
    req<{ ats_score: number; missing_keywords: string[]; recommendations: string[] }>(
      'POST', '/v1/ats/score', { cv_text, job_id }
    ),

  // CV Analysis
  analyzeCvText: (cv_text: string) =>
    req<{ analysis_id: string; analysis: CvAnalysis; credits_charged: number; attestation: unknown }>(
      'POST', '/v1/cv/analyze', { cv_text }
    ),
  listCvAnalyses: () => req<{ analyses: CvAnalysisMeta[] }>('GET', '/v1/cv/list'),
  getCvAnalysis: (id: string) => req<CvAnalysis & { analysis_id: string }>('GET', `/v1/cv/${id}`),
  setCvVisibility: (visible: boolean, desired_roles: string[], desired_locations: string[], keywords: string[]) =>
    req<{ ok: boolean }>('POST', '/v1/cv/visibility', { visible, desired_roles, desired_locations, keywords }),

  // RemoteOK jobs
  listRemoteOkJobs: (tag?: string) =>
    req<{ jobs: RemoteOkJob[]; count: number }>('GET', `/v1/job/remoteok${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`),
  ingestRemoteOkJob: (slug: string) =>
    req<{ job_id: string; parsed: unknown }>('POST', '/v1/job/remoteok/ingest', { slug }),

  // Country context
  getCountryContext: (country: string) =>
    req<CountryContext>('GET', `/v1/job/country-context?country=${encodeURIComponent(country)}`),
  listCountries: () =>
    req<{ countries: CountrySummary[] }>('GET', '/v1/job/countries'),

  // Interview
  prepareInterview: (job_id: string, company_context?: unknown) =>
    req<{ interview_pack: unknown; credits_charged: number }>(
      'POST', '/v1/interview/prepare', { job_id, company_context: company_context || {} }
    ),
}

// Types
export interface CvAnalysis {
  candidate_name: string
  summary: string
  ats_score: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  detected_skills: string[]
  sections_found: string[]
  word_count: number
}

export interface CvAnalysisMeta {
  id: string
  filename: string
  ats_score: number
  credits_charged: number
  created_at: number
}

export interface RemoteOkJob {
  remoteok_id: string
  slug: string
  title: string
  company: string
  location: string
  salary: string
  tags: string[]
  url: string
  posted_at: string
  logo: string
}

export interface CountrySummary {
  code: string
  name: string
  flag: string
  region: string
  cost_of_living_index: number
  income_tax_top_pct: number
  digital_nomad_visa: boolean
}

export interface CountryContext {
  name: string
  flag: string
  region: string
  currency: string
  official_languages: string[]
  timezone: string
  cost_of_living_index: number
  avg_tech_salary_usd: { junior: string; mid: string; senior: string }
  income_tax_top_pct: number
  social_security_employer_pct: number
  social_security_employee_pct: number
  healthcare: string
  contract_types_common: string[]
  b2b_contractor_notes: string
  digital_nomad_visa: boolean
  eu_citizen_right_to_work: boolean
  non_eu_work_permit: string
  remote_work_culture: string
  key_facts: string[]
  quality_of_life: string
}
