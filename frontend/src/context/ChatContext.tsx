import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { ChatMessage, ChatMode } from '../types'
import { api } from '../utils/api'

let msgSeq = 0
function mkMsg(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: String(++msgSeq), role, content }
}

interface ChatContextValue {
  chatMode: ChatMode
  setChatMode: (m: ChatMode) => void
  messages: ChatMessage[]
  chatResponding: boolean
  chatIdRef: React.MutableRefObject<string | undefined>
  sendChat: (text: string) => Promise<void>
  chatPanelVisible: boolean
  showChatPanel: () => void
  hideChatPanel: () => void
  activateChat: (chatId: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatIdRef = useRef<string | undefined>(undefined)
  const [chatMode, setChatMode] = useState<ChatMode>('floating')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatResponding, setChatResponding] = useState(false)
  const [chatPanelVisible, setChatPanelVisible] = useState(false)

  function activateChat(chatId: string) {
    chatIdRef.current = chatId
    setChatPanelVisible(true)
  }

  function showChatPanel() { setChatPanelVisible(true) }
  function hideChatPanel() { setChatPanelVisible(false) }

  async function sendChat(text: string) {
    setMessages(m => [...m, mkMsg('user', text)])
    setChatResponding(true)
    try {
      const res = (await api.chat({
        message: text,
        chat_id: chatIdRef.current,
      })) as Record<string, string>
      if (res.chat_id && !chatIdRef.current) {
        chatIdRef.current = res.chat_id
      }
      const reply = res.response ?? res.content ?? res.message ?? res.answer ?? 'No response'
      setMessages(m => [...m, mkMsg('assistant', reply)])
    } catch {
      setMessages(m => [...m, mkMsg('assistant', "Sorry, I couldn't respond right now.")])
    } finally {
      setChatResponding(false)
    }
  }

  return (
    <ChatContext.Provider value={{
      chatMode, setChatMode,
      messages, chatResponding,
      chatIdRef, sendChat,
      chatPanelVisible, showChatPanel, hideChatPanel,
      activateChat,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
