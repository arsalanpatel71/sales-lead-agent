import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrbitLoader, LeadTable } from '../../components'
import { LeadsSearchResponse } from '../../types'
import { api } from '../../utils/api'
import { useAppStore } from '../../store'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const navigate = useNavigate()

  const product = useAppStore(s => s.product)
  const setProduct = useAppStore(s => s.setProduct)
  const phase = useAppStore(s => s.phase)
  const setPhase = useAppStore(s => s.setPhase)
  const leads = useAppStore(s => s.leads)
  const setLeads = useAppStore(s => s.setLeads)
  const currentStep = useAppStore(s => s.currentStep)
  const setCurrentStep = useAppStore(s => s.setCurrentStep)
  const searchError = useAppStore(s => s.searchError)
  const setSearchError = useAppStore(s => s.setSearchError)
  const chatId = useAppStore(s => s.chatId)
  const activateChat = useAppStore(s => s.activateChat)
  const addMessage = useAppStore(s => s.addMessage)
  const showChatPanel = useAppStore(s => s.showChatPanel)
  const hideChatPanel = useAppStore(s => s.hideChatPanel)
  const sessionId = useAppStore(s => s.sessionId)

  const [expanded, setExpanded] = useState(false)
  const searchTokenRef = useRef<string>('')

  async function handleSearch() {
    const q = product.trim()
    if (!q || phase === 'loading') return

    const token = crypto.randomUUID()
    searchTokenRef.current = token

    const stale = () => searchTokenRef.current !== token || useAppStore.getState().sessionId !== sessionId

    setSearchError('')
    setProduct('')
    setPhase('loading')
    showChatPanel()
    addMessage({ id: `search-${Date.now()}`, role: 'user', content: q })

    setCurrentStep(0)
    const stepTimer = setInterval(
      () => setCurrentStep((s) => Math.min(s + 1, 4)),
      2200,
    )

    try {
      const data = (await api.searchLeads({ product: q, max_leads: 10, session_id: sessionId })) as LeadsSearchResponse
      clearInterval(stepTimer)
      if (stale()) return
      setCurrentStep(5)
      await new Promise((r) => setTimeout(r, 600))
      if (stale()) return
      activateChat(data.chat_id)
      setLeads(data.leads ?? [])
      setPhase('results')
    } catch (e) {
      clearInterval(stepTimer)
      if (stale()) return
      setSearchError(e instanceof Error ? e.message : 'Search failed')
      setPhase('idle')
      hideChatPanel()
    }
  }

  const isActive = phase !== 'idle'

  return (
    <div className={`${styles.root} ${isActive ? styles.rootActive : ''}`}>
      <div className={styles.bg}>
        <div className={styles.bgGlow} />
        <div className={styles.bgGrid} />
      </div>

      {!isActive && (
        <div className={styles.idleLayout}>
          <div className={styles.hero}>
            <p className={styles.heroEyebrow}>SALES AGENT</p>
            <h1 className={styles.heroTitle}>Find your next client</h1>
            <p className={styles.heroSub}>
              Describe what you're selling — ICP analysis, LinkedIn signals, and
              personalised outreach, handled.
            </p>
          </div>

          <div className={styles.searchArea}>
            <div className={styles.searchBox}>
              <textarea
                className={`${styles.textarea} ${expanded ? styles.textareaExpanded : ''}`}
                placeholder="What are you selling? Describe your product or service…"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                autoFocus
              />
              <div className={styles.searchActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => setExpanded((v) => !v)}
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? '⊟' : '⊞'}
                </button>
                <button
                  className={styles.searchBtn}
                  onClick={handleSearch}
                  disabled={!product.trim()}
                >
                  →
                </button>
              </div>
            </div>
            {searchError && <p className={styles.errorMsg}>{searchError}</p>}
            <p className={styles.searchHint}>
              Press Enter to search · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <div className={styles.content} style={{ animation: 'dashFadeIn 0.4s ease both' }}>
          {phase === 'loading' && (
            <div className={styles.loaderWrapper}>
              <OrbitLoader currentStep={currentStep} />
            </div>
          )}

          {phase === 'results' && (
            <div className={styles.results}>
              <div className={styles.resultsHeader}>
                <p className={styles.resultsLabel}>
                  {leads.length} lead{leads.length !== 1 ? 's' : ''} found
                </p>
                <div className={styles.resultsActions}>
                  <button
                    className={styles.newSearchBtn}
                    onClick={() => { setPhase('idle'); setLeads([]); hideChatPanel() }}
                  >
                    ← New search
                  </button>
                  <button
                    className={styles.viewAllBtn}
                    onClick={() =>
                      navigate(`/leads?chat_id=${encodeURIComponent(chatId ?? '')}`)
                    }
                  >
                    View all →
                  </button>
                </div>
              </div>
              <LeadTable leads={leads.slice(0, 9)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
