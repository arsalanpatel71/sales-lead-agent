import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { OrbitLoader } from '../../components'
import { Lead, LeadsSearchResponse } from '../../types'
import { api } from '../../utils/api'
import { useChatContext } from '../../context/ChatContext'
import styles from './Dashboard.module.css'

type Phase = 'idle' | 'loading' | 'results'

export function Dashboard() {
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)
  const { activateChat, chatIdRef, chatMode, setChatMode, showChatPanel, hideChatPanel } = useChatContext()

  const [phase, setPhase] = useState<Phase>('idle')
  const [product, setProduct] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')

  // Sync chat panel visibility with dashboard phase
  useEffect(() => {
    if (phase !== 'idle') {
      showChatPanel()
    } else {
      hideChatPanel()
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch() {
    const q = product.trim()
    if (!q || phase === 'loading') return
    setError('')

    // FLIP animation: record current (idle/centered) position
    const el = searchRef.current!
    const first = el.getBoundingClientRect()
    const firstW = el.offsetWidth

    // Switch to loading — re-renders search to active (bottom-left) position
    flushSync(() => setPhase('loading'))

    // Apply inverse transform to make it look like it's still in idle position
    const last = el.getBoundingClientRect()
    const dx = first.left - last.left
    const dy = first.top - last.top
    el.style.transition = 'none'
    el.style.transform = `translate(${dx}px, ${dy}px)`
    el.style.width = `${firstW}px`

    // Next frame: animate to the active position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition =
          'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.6s ease'
        el.style.transform = ''
        el.style.width = ''
        setTimeout(() => {
          el.style.transition = ''
        }, 900)
      })
    })

    // Advance loading steps
    setCurrentStep(0)
    const stepTimer = setInterval(
      () => setCurrentStep(s => Math.min(s + 1, 4)),
      2200,
    )

    try {
      const data = (await api.searchLeads({ product: q, max_leads: 10 })) as LeadsSearchResponse
      clearInterval(stepTimer)
      setCurrentStep(5)
      await new Promise(r => setTimeout(r, 600))
      const found = data.leads ?? []
      activateChat(data.chat_id)
      setLeads(found)
      setPhase('results')
    } catch (e) {
      clearInterval(stepTimer)
      setError(e instanceof Error ? e.message : 'Search failed')
      setPhase('idle')
    }
  }

  const isActive = phase !== 'idle'

  return (
    <div className={`${styles.root} ${isActive ? styles.rootActive : ''}`}>
      {/* Background */}
      <div className={styles.bg}>
        <div className={styles.bgGlow} />
        <div className={styles.bgGrid} />
      </div>

      {/* Hero — only shown in idle */}
      <div className={`${styles.hero} ${isActive ? styles.heroHidden : ''}`}>
        <p className={styles.heroEyebrow}>SALES AGENT</p>
        <h1 className={styles.heroTitle}>Find your next client</h1>
        <p className={styles.heroSub}>
          Describe what you're selling — ICP analysis, LinkedIn signals, and
          personalised outreach, handled.
        </p>
      </div>

      {/* Main content area (loading / results) */}
      {isActive && (
        <div
          className={`${styles.content} ${chatMode === 'static' ? styles.contentWithChat : ''}`}
          style={{ animation: 'dashFadeIn 0.5s ease 0.55s both' }}
        >
          {phase === 'loading' && <OrbitLoader currentStep={currentStep} />}
          {phase === 'results' && (
            <div className={styles.results}>
              <div className={styles.resultsHeader}>
                <p className={styles.resultsLabel}>
                  {leads.length} lead{leads.length !== 1 ? 's' : ''} found
                </p>
                <button
                  className={styles.viewAllBtn}
                  onClick={() => navigate(`/leads?chat_id=${encodeURIComponent(chatIdRef.current ?? '')}`)}
                >
                  View all →
                </button>
              </div>
              <div className={styles.leadGrid}>
                {leads.slice(0, 9).map(lead => (
                  <div
                    key={lead.id}
                    className={styles.leadCard}
                    onClick={() => navigate(`/leads/${encodeURIComponent(lead.lead_id ?? lead.id)}`)}
                  >
                    <div className={styles.leadAvatar}>
                      {(lead.name || lead.first_name || '?')[0].toUpperCase()}
                    </div>
                    <div className={styles.leadInfo}>
                      <p className={styles.leadName}>{lead.name}</p>
                      <p className={styles.leadMeta}>
                        {lead.title}
                        {lead.company ? ` · ${lead.company}` : ''}
                      </p>
                    </div>
                    {lead.signal_strength && (
                      <span
                        className={`${styles.signalBadge} ${lead.signal_strength === 'strong' ? styles.strong : styles.weak}`}
                      >
                        {lead.signal_strength}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search field — always mounted, position changes via FLIP */}
      <div
        ref={searchRef}
        className={`${styles.search} ${isActive ? styles.searchActive : styles.searchIdle}`}
      >
        <div className={styles.searchBox}>
          <textarea
            className={`${styles.textarea} ${!isActive ? styles.textareaLarge : ''} ${expanded ? styles.textareaExpanded : ''}`}
            placeholder={
              isActive
                ? 'Search again…'
                : 'What are you selling? Describe your product or service…'
            }
            value={product}
            onChange={e => setProduct(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSearch()
              }
            }}
          />
          <div className={styles.searchActions}>
            <button
              className={styles.actionBtn}
              onClick={() => setExpanded(v => !v)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '⊟' : '⊞'}
            </button>
            <button
              className={styles.actionBtn}
              onClick={() =>
                setChatMode(chatMode === 'static' ? 'floating' : 'static')
              }
              title={
                chatMode === 'static'
                  ? 'Switch to floating chat'
                  : 'Switch to panel chat'
              }
            >
              {chatMode === 'static' ? '⊙' : '▣'}
            </button>
            <button
              className={styles.searchBtn}
              onClick={handleSearch}
              disabled={!product.trim() || phase === 'loading'}
            >
              →
            </button>
          </div>
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        {!isActive && (
          <p className={styles.searchHint}>
            Press Enter to search · Shift+Enter for new line
          </p>
        )}
      </div>
    </div>
  )
}
