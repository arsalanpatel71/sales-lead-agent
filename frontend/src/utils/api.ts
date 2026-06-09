import { ChatResponse, HistoryMessage, Lead, SessionSummary, SessionsPage } from '../types'

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
  // Single chat entry point — manager agent decides intent
  chat: (body: { message: string; session_id?: string }) =>
    request<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify(body) }),

  // Structured outreach form (Communication page)
  generateCommunication: (body: object) =>
    request('/outreach_email_phone/generate', { method: 'POST', body: JSON.stringify(body) }),

  // Session history (paginated)
  getSessions: (page = 1, pageSize = 10) =>
    request<SessionsPage>(`/history?page=${page}&page_size=${pageSize}`),

  getSession: (sessionId: string) =>
    request<{ session_id: string; messages: HistoryMessage[] }>(`/history/${sessionId}`),

  // Fetch a specific lead result set by leads_id
  getLeadsById: (leadsId: string) =>
    request<{ leads: Lead[]; total: number; leads_id: string }>(`/campaign/results/${leadsId}`),
}
