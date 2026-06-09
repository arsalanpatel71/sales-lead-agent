import { useState } from 'react'
import { useAppStore } from '../../store'
import { navigate } from '../../utils/navigation'
import styles from './LeadCard.module.css'

interface LeadCardProps {
  leadsId: string
  leadsCount: number
}

export function LeadCard({ leadsId, leadsCount }: LeadCardProps) {
  const loadLeads = useAppStore(s => s.loadLeads)
  const showChatPanel = useAppStore(s => s.showChatPanel)
  const [loading, setLoading] = useState(false)

  async function handleView() {
    setLoading(true)
    await loadLeads(leadsId)
    setLoading(false)
    showChatPanel()
    navigate(`/leads?leads_id=${leadsId}`)
  }

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <span className={styles.icon}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <div className={styles.meta}>
          <span className={styles.count}>{leadsCount} leads found</span>
          <span className={styles.sub}>Lead search · click to view</span>
        </div>
      </div>
      <button
        className={styles.viewBtn}
        onClick={handleView}
        disabled={loading}
      >
        {loading ? '…' : 'View →'}
      </button>
    </div>
  )
}
