'use client'

export function saveToken(token: string) {
  localStorage.setItem('cf_token', token)
}

export function clearToken() {
  localStorage.removeItem('cf_token')
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cf_token')
}

export function isLoggedIn(): boolean {
  const t = getToken()
  if (!t) return false
  try {
    const payload = JSON.parse(atob(t.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
