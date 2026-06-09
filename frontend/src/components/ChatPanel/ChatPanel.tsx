import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { MessageBubble, TypingBubble } from '../MessageBubble'
import styles from './ChatPanel.module.css'

export function ChatPanel() {
  const chatMode = useAppStore(s => s.chatMode)
  const setChatMode = useAppStore(s => s.setChatMode)
  const messages = useAppStore(s => s.messages)
  const responding = useAppStore(s => s.responding)
  const send = useAppStore(s => s.send)

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
  }, [messages, responding])

  function submit() {
    const text = input.trim()
    if (!text || responding) return
    setInput('')
    send(text)
    inputRef.current?.focus()
  }

  function onDragMouseDown(e: React.MouseEvent) {
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
        <p className={styles.empty}>Ask me anything about your leads…</p>
      )}
      {messages.map(m => (
        <MessageBubble key={m.id} role={m.role} content={m.content} />
      ))}
      {responding && <TypingBubble />}
      <div ref={messagesEndRef} />
    </div>
  )

  const inputRow = (
    <div className={styles.inputRow}>
      <input
        ref={inputRef}
        className={styles.chatInput}
        placeholder={responding ? 'Working on it…' : 'Ask anything…'}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        autoComplete="off"
        disabled={responding}
      />
      <button className={styles.sendBtn} onClick={submit} disabled={!input.trim() || responding}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )

  if (chatMode === 'static') {
    return (
      <div className={styles.staticPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelMeta}>
            <span className={styles.onlineDot} />
            <span className={styles.panelTitle}>Assistant</span>
          </div>
          <button className={styles.iconBtn} onClick={() => setChatMode('floating')} title="Pop out">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8M8 1h4m0 0v4m0-4L5.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
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
        <span>Assistant</span>
        {messages.length > 0 && <span className={styles.pillBadge}>{messages.length}</span>}
      </button>
    )
  }

  const floatStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 80 }

  return (
    <div ref={cardRef} className={styles.floatCard} style={floatStyle}>

      {/* Invisible drag zone across full top */}
      <div className={styles.dragZone} onMouseDown={onDragMouseDown} />

      {/* Action buttons — top right, appear on hover */}
      <div className={styles.floatActions}>
        <button className={styles.floatBtn} onClick={() => setChatMode('static')} title="Dock">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 4.5h10" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
        <button className={styles.floatBtn} onClick={() => setMinimized(true)} title="Minimise">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Online indicator + label — top left */}
      <div className={styles.assistantMeta}>
        <span className={styles.onlineDot} />
        <span className={styles.assistantName}>Assistant</span>
      </div>

      {messageList(styles.floatMessages)}
      {inputRow}
    </div>
  )
}
