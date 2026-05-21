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
  searchLeads: (body: { product: string; max_leads?: number; allow_no_email?: boolean }) =>
    request('/leads/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getLeads: (chatId?: string) => {
    const params = new URLSearchParams()
    if (chatId) params.set('chat_id', chatId)
    return request(`/leads?${params}`)
  },

  getLead: (leadId: string) =>
    request(`/leads/${encodeURIComponent(leadId)}`),

  getChats: () =>
    request('/leads/chats'),

  searchLinkedIn: (body: object) =>
    request('/linkedin/search', { method: 'POST', body: JSON.stringify(body) }),

  searchApollo: (body: object) =>
    request('/apollo/search', { method: 'POST', body: JSON.stringify(body) }),

  generateCommunication: (body: object) =>
    request('/communication/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  chat: (body: { message: string; chat_id?: string }) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getChatMessages: (chatId: string) =>
    request(`/chat/${encodeURIComponent(chatId)}/messages`),
}
