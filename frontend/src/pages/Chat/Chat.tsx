import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LeadCard, MessageBubble, TypingBubble } from '../../components'
import { useAppStore } from '../../store'
import styles from './Chat.module.css'

export function Chat() {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>()

  const storeSessionId = useAppStore(s => s.sessionId)
  const messages = useAppStore(s => s.messages)
  const responding = useAppStore(s => s.responding)
  const send = useAppStore(s => s.send)
  const loadSession = useAppStore(s => s.loadSession)

  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadedSession = useRef<string | null>(null)

  // Load historical session if URL sessionId differs from store's current session
  useEffect(() => {
    if (!urlSessionId) return
    if (urlSessionId === storeSessionId) return
    if (loadedSession.current === urlSessionId) return
    loadedSession.current = urlSessionId
    loadSession(urlSessionId)
  }, [urlSessionId, storeSessionId, loadSession])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, responding])

  function submit() {
    const text = input.trim()
    if (!text || responding) return
    setInput('')
    send(text)
    inputRef.current?.focus()
  }

  return (
    <div className={styles.page}>
      <div className={styles.thread}>
        {messages.length === 0 && (
          <p className={styles.empty}>Ask me anything — leads, outreach, or strategy.</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={styles.msgGroup}>
            <MessageBubble role={m.role} content={m.content} />
            {m.role === 'assistant' && m.leadsId && (
              <LeadCard
                leadsId={m.leadsId}
                leadsCount={m.leadsCount ?? 0}
              />
            )}
          </div>
        ))}
        {responding && <TypingBubble />}
        <div ref={endRef} />
      </div>

      <div className={styles.composer}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={responding ? 'Working on it…' : 'Message SalesAI…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            autoFocus
            autoComplete="off"
            disabled={responding}
          />
          <button className={styles.sendBtn} onClick={submit} disabled={!input.trim() || responding}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
