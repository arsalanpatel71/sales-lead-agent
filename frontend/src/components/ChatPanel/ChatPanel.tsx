import { useRef, useState, useEffect } from 'react'
import { ChatMessage, ChatMode } from '../../types'
import styles from './ChatPanel.module.css'

interface Props {
  mode: ChatMode
  messages: ChatMessage[]
  onSend: (text: string) => void
  onModeChange: (mode: ChatMode) => void
  responding: boolean
}

export function ChatPanel({ mode, messages, onSend, onModeChange, responding }: Props) {
  const [input, setInput] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 })

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, responding])

  function submit() {
    const text = input.trim()
    if (!text) return
    setInput('')
    onSend(text)
  }

  function onHeaderMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    if (mode !== 'floating') return
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

  const MessageList = ({ className }: { className: string }) => (
    <div className={className} ref={messagesRef}>
      {messages.length === 0 && (
        <p className={styles.empty}>Ask the agent about your leads or product…</p>
      )}
      {messages.map(m => (
        <div key={m.id} className={`${styles.msg} ${m.role === 'user' ? styles.userMsg : styles.assistantMsg}`}>
          {m.content}
        </div>
      ))}
      {responding && (
        <div className={styles.typing}>
          <span /><span /><span />
        </div>
      )}
    </div>
  )

  const InputRow = () => (
    <div className={styles.inputRow}>
      <input
        className={styles.chatInput}
        placeholder="Ask anything…"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoComplete="off"
      />
      <button className={styles.sendBtn} onClick={submit} disabled={!input.trim()}>→</button>
    </div>
  )

  if (mode === 'static') {
    return (
      <div className={styles.staticPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Agent Chat</span>
          <div className={styles.headerActions}>
            <button
              className={styles.iconBtn}
              onClick={() => onModeChange('floating')}
              title="Switch to floating"
            >
              ⊛
            </button>
          </div>
        </div>
        <MessageList className={styles.staticMessages} />
        <InputRow />
      </div>
    )
  }

  // Floating mode — minimized pill
  if (minimized) {
    return (
      <button className={styles.pill} onClick={() => setMinimized(false)}>
        <span className={styles.pillDot} />
        Agent
        {messages.length > 0 && (
          <span className={styles.pillBadge}>{messages.length}</span>
        )}
      </button>
    )
  }

  // Floating mode — expanded card
  const floatStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 80 }

  return (
    <div ref={cardRef} className={styles.floatCard} style={floatStyle}>
      <div className={styles.floatHeader} onMouseDown={onHeaderMouseDown}>
        <span className={styles.floatTitle}>Agent</span>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => onModeChange('static')}
            title="Dock to panel"
          >
            ⊞
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setMinimized(true)}
            title="Minimise"
          >
            −
          </button>
        </div>
      </div>
      <MessageList className={styles.floatMessages} />
      <InputRow />
    </div>
  )
}
