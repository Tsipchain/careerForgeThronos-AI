const BASE = process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cf_token') || ''
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
  upsertProfile: (data: unknown) => req<unknown>('POST', '/v1/profile/upsert', data),

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
}
