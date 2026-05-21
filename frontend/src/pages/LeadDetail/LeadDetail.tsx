import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../../components'
import { Lead } from '../../types'
import { scoreColor, signalLabel } from '../../utils/formatters'
import styles from './LeadDetail.module.css'

export function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState<Lead | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('leads')
    if (raw) {
      const leads: Lead[] = JSON.parse(raw)
      setLead(leads.find(l => l.id === id) ?? null)
    }
  }, [id])

  if (!lead) {
    return <div className={styles.empty}><p className="body-md">Lead not found.</p></div>
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={styles.page}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>← Back</Button>

      <Card className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <h1 className="heading-md">{lead.name}</h1>
            <p className="body-md" style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {lead.title} · {lead.company}
            </p>
            {lead.email && (
              <p className="body-sm" style={{ color: 'var(--color-primary-500)', marginTop: 4 }}>{lead.email}</p>
            )}
          </div>
          <div className={styles.scoreBlock}>
            <span className="heading-lg" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
            <p className="label" style={{ color: 'var(--color-text-muted)' }}>Score</p>
          </div>
        </div>
        <div className={styles.tags}>
          <Badge label={signalLabel(lead.signal_strength)} variant={lead.signal_strength === 'strong' ? 'gold' : 'silver'} dot />
          {lead.email_status && <Badge label={lead.email_status} variant={lead.email_status === 'verified' ? 'emerald' : 'default'} />}
        </div>
      </Card>

      {lead.signal_context && (
        <Card>
          <p className="label" style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>Signal context</p>
          <p className="body-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>{lead.signal_context}</p>
        </Card>
      )}

      {lead.outreach && (
        <Card>
          <div className={styles.outreachHeader}>
            <p className="label" style={{ color: 'var(--color-text-muted)' }}>Outreach draft</p>
            <Button variant="secondary" size="sm" onClick={() => copy(`Subject: ${lead.outreach!.subject}\n\n${lead.outreach!.body}`)}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="body-sm" style={{ fontWeight: 500, marginBottom: 8 }}>{lead.outreach.subject}</p>
          <div className={styles.goldLine} />
          <p className="body-sm" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', marginTop: 10 }}>{lead.outreach.body}</p>
        </Card>
      )}

      <Button onClick={() => navigate(`/communicate?leadId=${lead.id}`)}>
        Generate Email / Phone Script
      </Button>
    </div>
  )
}
