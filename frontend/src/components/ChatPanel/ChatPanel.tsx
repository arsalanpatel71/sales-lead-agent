import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import styles from './ChatPanel.module.css'

export function ChatPanel() {
  const chatMode = useAppStore(s => s.chatMode)
  const setChatMode = useAppStore(s => s.setChatMode)
  const messages = useAppStore(s => s.messages)
  const chatResponding = useAppStore(s => s.chatResponding)
  const sendChat = useAppStore(s => s.sendChat)
  const phase = useAppStore(s => s.phase)

  const [input, setInput] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatResponding])

  function submit() {
    const text = input.trim()
    if (!text) return
    setInput('')
    sendChat(text)
    inputRef.current?.focus()
  }

  function onHeaderMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    if (chatMode !== 'floating') return
    const el = cardRef.current!
    const rect = el.getBoundingClientRect()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, cx: rect.left, cy: rect.top }

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return
      setPos({
        x: Math.max(0, dragStart.current.cx + (ev.clientX - dragStart.current.mx)),
        y: Math.max(0, dragStart.current.cy + (ev.clientY - dragStart.current.my)),
      })
    }
    function onUp() {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    e.preventDefault()
  }

  const messageList = (className: string) => (
    <div className={className}>
      {messages.length === 0 && (
        <p className={styles.empty}>Ask the agent about your leads or product…</p>
      )}
      {messages.map(m => (
        <div
          key={m.id}
          className={`${styles.msg} ${m.role === 'user' ? styles.userMsg : styles.assistantMsg}`}
        >
          {m.content}
        </div>
      ))}
      {chatResponding && (
        <div className={styles.typing}>
          <span /><span /><span />
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )

  const isBlocked = chatResponding || phase === 'loading'

  const inputRow = (
    <div className={styles.inputRow}>
      <input
        ref={inputRef}
        className={styles.chatInput}
        placeholder={isBlocked ? 'Searching…' : 'Ask anything…'}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        autoComplete="off"
        disabled={isBlocked}
      />
      <button className={styles.sendBtn} onClick={submit} disabled={!input.trim() || isBlocked}>→</button>
    </div>
  )

  if (chatMode === 'static') {
    return (
      <div className={styles.staticPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Agent Chat</span>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => setChatMode('floating')} title="Switch to floating">⊛</button>
          </div>
        </div>
        {messageList(styles.staticMessages)}
        {inputRow}
      </div>
    )
  }

  if (minimized) {
    return (
      <button className={styles.pill} onClick={() => setMinimized(false)}>
        <span className={styles.pillDot} />
        Agent
        {messages.length > 0 && <span className={styles.pillBadge}>{messages.length}</span>}
      </button>
    )
  }

  const floatStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 80 }

  return (
    <div ref={cardRef} className={styles.floatCard} style={floatStyle}>
      <div className={styles.floatHeader} onMouseDown={onHeaderMouseDown}>
        <span className={styles.floatTitle}>Agent</span>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={() => setChatMode('static')} title="Dock to panel">⊞</button>
          <button className={styles.iconBtn} onClick={() => setMinimized(true)} title="Minimise">−</button>
        </div>
      </div>
      {messageList(styles.floatMessages)}
      {inputRow}
    </div>
  )
}
