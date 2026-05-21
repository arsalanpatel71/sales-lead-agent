import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Card, Spinner } from '../../components'
import { Lead } from '../../types'
import { api } from '../../utils/api'
import { useChatContext } from '../../context/ChatContext'
import { initials, scoreColor, signalLabel } from '../../utils/formatters'
import styles from './Leads.module.css'

export function Leads() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activateChat, showChatPanel } = useChatContext()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const chatId = searchParams.get('chat_id') ?? undefined
    if (chatId) {
      activateChat(chatId)
      showChatPanel()
    }
    ;(api.getLeads(chatId) as Promise<{ leads: Lead[] }>)
      .then(data => setLeads(data.leads ?? []))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load leads'))
      .finally(() => setLoading(false))
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className={styles.empty}><Spinner label="Loading leads…" /></div>

  if (error) return (
    <div className={styles.empty}>
      <p className="body-sm" style={{ color: 'var(--color-rose-500)' }}>{error}</p>
    </div>
  )

  if (!leads.length) {
    return (
      <div className={styles.empty}>
        <p className="heading-sm" style={{ color: 'var(--color-text-muted)' }}>No leads yet</p>
        <p className="body-sm">Run a campaign from the Dashboard first.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className="label" style={{ color: 'var(--color-primary-400)' }}>{leads.length} leads found</p>
        <h1 className="heading-md">Results</h1>
      </div>
      <div className={styles.list}>
        {leads.map(lead => (
          <Card
            key={lead.lead_id ?? lead.id}
            hoverable
            onClick={() => navigate(`/leads/${encodeURIComponent(lead.lead_id ?? lead.id)}`)}
          >
            <div className={styles.row}>
              <div className={styles.avatar}>{initials(lead.name)}</div>
              <div className={styles.info}>
                <p className="body-md" style={{ fontWeight: 500 }}>{lead.name}</p>
                <p className="body-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {lead.title}{lead.company ? ` · ${lead.company}` : ''}
                </p>
              </div>
              <div className={styles.meta}>
                <Badge
                  label={signalLabel(lead.signal_strength)}
                  variant={lead.signal_strength === 'strong' ? 'gold' : lead.signal_strength === 'weak' ? 'silver' : 'default'}
                  dot
                />
                <span className={styles.score} style={{ color: scoreColor(lead.score) }}>
                  {lead.score}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
