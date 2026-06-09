import { useState, useEffect } from 'react'
import { OrbitLoader } from '../../components'
import { useAppStore } from '../../store'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const product = useAppStore(s => s.product)
  const setProduct = useAppStore(s => s.setProduct)
  const phase = useAppStore(s => s.phase)
  const currentStep = useAppStore(s => s.currentStep)
  const setCurrentStep = useAppStore(s => s.setCurrentStep)
  const send = useAppStore(s => s.send)

  const [expanded, setExpanded] = useState(false)
  const isLoading = phase === 'loading'

  // Step the orbit loader while a request is in flight.
  useEffect(() => {
    if (!isLoading) return
    setCurrentStep(0)
    const timer = setInterval(() => setCurrentStep(s => Math.min(s + 1, 4)), 2000)
    return () => clearInterval(timer)
  }, [isLoading, setCurrentStep])

  function submit() {
    const q = product.trim()
    if (!q || isLoading) return
    setProduct('')
    send(q)
  }

  return (
    <div className={styles.root}>
      <div className={styles.bg}>
        <div className={styles.bgGlow} />
        <div className={styles.bgGrid} />
      </div>

      {!isLoading && (
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
                placeholder="What are you selling? Or ask me anything…"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
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
                  onClick={submit}
                  disabled={!product.trim()}
                >
                  →
                </button>
              </div>
            </div>
            <p className={styles.searchHint}>
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className={styles.content} style={{ animation: 'dashFadeIn 0.4s ease both' }}>
          <div className={styles.loaderWrapper}>
            <OrbitLoader currentStep={currentStep} />
          </div>
        </div>
      )}
    </div>
  )
}
