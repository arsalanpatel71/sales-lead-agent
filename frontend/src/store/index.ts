import { create } from 'zustand'
import { ChatMessage, ChatMode, Lead } from '../types'
import { api } from '../utils/api'

export type Phase = 'idle' | 'loading' | 'results'

const sessionId = crypto.randomUUID()

let msgSeq = 0
function mkMsg(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: String(++msgSeq), role, content }
}

interface AppStore {
  // ── Session
  sessionId: string

  // ── Campaign / search
  product: string
  phase: Phase
  leads: Lead[]
  currentStep: number
  searchError: string

  setProduct: (p: string) => void
  setPhase: (p: Phase) => void
  setLeads: (l: Lead[]) => void
  setCurrentStep: (s: number | ((prev: number) => number)) => void
  setSearchError: (e: string) => void

  // ── Chat
  chatId: string | undefined
  chatMode: ChatMode
  messages: ChatMessage[]
  chatResponding: boolean
  chatPanelVisible: boolean

  setChatMode: (m: ChatMode) => void
  showChatPanel: () => void
  hideChatPanel: () => void
  activateChat: (chatId: string) => void
  addMessage: (msg: ChatMessage) => void
  sendChat: (text: string) => Promise<void>
  resetSession: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Session
  sessionId,

  // ── Campaign
  product: '',
  phase: 'idle',
  leads: [],
  currentStep: 0,
  searchError: '',

  setProduct: (product) => set({ product }),
  setPhase: (phase) => set({ phase }),
  setLeads: (leads) => set({ leads }),
  setCurrentStep: (s) =>
    set((state) => ({
      currentStep: typeof s === 'function' ? s(state.currentStep) : s,
    })),
  setSearchError: (searchError) => set({ searchError }),

  // ── Chat
  chatId: undefined,
  chatMode: 'floating',
  messages: [],
  chatResponding: false,
  chatPanelVisible: false,

  setChatMode: (chatMode) => set({ chatMode }),
  showChatPanel: () => set({ chatPanelVisible: true }),
  hideChatPanel: () => set({ chatPanelVisible: false }),

  activateChat: (chatId) => set({ chatId, chatPanelVisible: true }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  resetSession: () => set({
    sessionId: crypto.randomUUID(),
    messages: [],
    chatId: undefined,
    leads: [],
    phase: 'idle',
    chatPanelVisible: false,
    chatResponding: false,
    searchError: '',
    currentStep: 0,
    product: '',
  }),

  sendChat: async (text) => {
    set((state) => ({
      messages: [...state.messages, mkMsg('user', text)],
      chatResponding: true,
    }))
    try {
      const res = (await api.chat({
        message: text,
        chat_id: get().chatId,
        session_id: get().sessionId,
      })) as Record<string, string>
      if (res.chat_id && !get().chatId) {
        set({ chatId: res.chat_id })
      }
      const reply =
        res.response ?? res.content ?? res.message ?? res.answer ?? 'No response'
      set((state) => ({
        messages: [...state.messages, mkMsg('assistant', reply)],
      }))
    } catch {
      set((state) => ({
        messages: [
          ...state.messages,
          mkMsg('assistant', "Sorry, I couldn't respond right now."),
        ],
      }))
    } finally {
      set({ chatResponding: false })
    }
  },
}))
