import { create } from 'zustand'
import { ChatMessage, ChatMode, Lead, OutreachResult, SessionSummary } from '../types'
import { api } from '../utils/api'
import { navigate } from '../utils/navigation'

export type Phase = 'idle' | 'loading'

let msgSeq = 0
function mkMsg(
  role: ChatMessage['role'],
  content: string,
  extra?: Pick<ChatMessage, 'leadsId' | 'leadsCount'>,
): ChatMessage {
  return { id: String(++msgSeq), role, content, ...extra }
}

interface AppStore {
  // ── Session
  sessionId: string

  // ── Composer (home hero input)
  product: string
  setProduct: (p: string) => void

  // ── Conversation
  messages: ChatMessage[]
  responding: boolean
  phase: Phase
  currentStep: number
  setCurrentStep: (s: number | ((prev: number) => number)) => void
  addMessage: (msg: ChatMessage) => void

  // ── Results
  leads: Lead[]
  outreach: OutreachResult | null
  setLeads: (l: Lead[]) => void

  // ── Chat panel (floating widget shown on result pages)
  chatMode: ChatMode
  chatPanelVisible: boolean
  setChatMode: (m: ChatMode) => void
  showChatPanel: () => void
  hideChatPanel: () => void

  // ── History (sidebar session list, paginated)
  sessions: SessionSummary[]
  sessionsPage: number
  sessionsTotalPages: number
  sessionsLoading: boolean
  loadSessions: (page?: number) => Promise<void>

  // ── Load a past (or any) session by ID
  loadSession: (sessionId: string) => Promise<void>

  // ── Load a specific lead result set by leads_id
  loadLeads: (leadsId: string) => Promise<void>

  // ── Single send action
  send: (text: string) => Promise<void>
  resetSession: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  sessionId: crypto.randomUUID(),

  product: '',
  setProduct: (product) => set({ product }),

  messages: [],
  responding: false,
  phase: 'idle',
  currentStep: 0,
  setCurrentStep: (s) =>
    set((state) => ({ currentStep: typeof s === 'function' ? s(state.currentStep) : s })),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  leads: [],
  outreach: null,
  setLeads: (leads) => set({ leads }),

  chatMode: 'floating',
  chatPanelVisible: false,
  setChatMode: (chatMode) => set({ chatMode }),
  showChatPanel: () => set({ chatPanelVisible: true }),
  hideChatPanel: () => set({ chatPanelVisible: false }),

  sessions: [],
  sessionsPage: 1,
  sessionsTotalPages: 1,
  sessionsLoading: false,
  loadSessions: async (page = 1) => {
    set({ sessionsLoading: true })
    try {
      const data = await api.getSessions(page)
      set({ sessions: data.items, sessionsPage: data.page, sessionsTotalPages: data.total_pages })
    } catch {
      // non-critical — sidebar just stays empty
    } finally {
      set({ sessionsLoading: false })
    }
  },

  loadSession: async (sessionId: string) => {
    try {
      const data = await api.getSession(sessionId)
      const messages: ChatMessage[] = data.messages.map((m, i) => ({
        id: `hist-${sessionId}-${i}`,
        role: m.role,
        content: m.content,
        leadsId: m.leads_id,
        leadsCount: m.leads_count,
      }))
      set({ sessionId, messages, leads: [], chatPanelVisible: false })
    } catch (e) {
      console.error('[store] loadSession failed', e)
    }
  },

  loadLeads: async (leadsId: string) => {
    try {
      const data = await api.getLeadsById(leadsId)
      set({ leads: data.leads })
    } catch (e) {
      console.error('[store] loadLeads failed', e)
    }
  },

  send: async (text) => {
    const message = text.trim()
    if (!message || get().phase === 'loading') return

    set((state) => ({
      messages: [...state.messages, mkMsg('user', message)],
      responding: true,
      phase: 'loading',
    }))

    try {
      const res = await api.chat({ message, session_id: get().sessionId })

      // Build the assistant message — attach leads metadata if this was a lead search
      const assistantMsg = mkMsg('assistant', res.response, {
        leadsId: res.intent === 'lead_search' ? res.leads_id : undefined,
        leadsCount: res.intent === 'lead_search' ? (res.total ?? 0) : undefined,
      })
      set((state) => ({ messages: [...state.messages, assistantMsg] }))

      const sid = get().sessionId
      switch (res.intent) {
        case 'lead_search':
          set({ leads: res.leads ?? [], chatMode: 'floating', chatPanelVisible: true })
          navigate(`/leads?leads_id=${res.leads_id}`)
          break
        case 'outreach':
          set({ outreach: res.outreach ?? null, chatMode: 'floating', chatPanelVisible: true })
          navigate(`/outreach/${sid}`)
          break
        default:
          set({ chatPanelVisible: false })
          navigate(`/chat/${sid}`)
      }
    } catch (e) {
      set((state) => ({
        messages: [
          ...state.messages,
          mkMsg('assistant', e instanceof Error ? `Something went wrong: ${e.message}` : "Sorry, I couldn't respond right now."),
        ],
      }))
      navigate(`/chat/${get().sessionId}`)
    } finally {
      set({ responding: false, phase: 'idle' })
    }
  },

  resetSession: () =>
    set({
      sessionId: crypto.randomUUID(),
      product: '',
      messages: [],
      responding: false,
      phase: 'idle',
      currentStep: 0,
      leads: [],
      outreach: null,
      chatPanelVisible: false,
    }),
}))
