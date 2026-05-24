const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8002'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  searchLeads: (body: { product: string; allow_no_email?: boolean; session_id?: string }) =>
    request('/campaign/search', { method: 'POST', body: JSON.stringify(body) }),

  generateCommunication: (body: object) =>
    request('/outreach_email_phone/generate', { method: 'POST', body: JSON.stringify(body) }),

  chat: (body: { message: string; chat_id?: string; session_id?: string }) =>
    request('/chat', { method: 'POST', body: JSON.stringify(body) }),
}
