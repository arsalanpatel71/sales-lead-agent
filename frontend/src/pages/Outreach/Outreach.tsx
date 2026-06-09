import { useState } from 'react'
import { Card } from '../../components'
import { useAppStore } from '../../store'
import styles from './Outreach.module.css'

export function Outreach() {
  const outreach = useAppStore(s => s.outreach)
  const [copied, setCopied] = useState(false)

  if (!outreach) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No outreach yet</p>
        <p className={styles.emptySub}>Ask the assistant to write an email for a lead.</p>
      </div>
    )
  }

  const subject = typeof outreach.subject === 'string' ? outreach.subject : ''
  const body = typeof outreach.body === 'string' ? outreach.body : ''

  // Anything beyond subject/body (e.g. phone-script fields) is rendered generically.
  const extras = Object.entries(outreach).filter(
    ([k, v]) => !['subject', 'body', 'personalization_hook'].includes(k) && typeof v === 'string',
  ) as [string, string][]

  function copy() {
    navigator.clipboard.writeText(subject ? `Subject: ${subject}\n\n${body}` : body)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Outreach</p>
        <h1 className={styles.title}>Your draft</h1>
      </div>

      {(subject || body) && (
        <Card>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Email</p>
            <button className={styles.copyBtn} onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          {subject && <p className={styles.subject}>{subject}</p>}
          <div className={styles.goldLine} />
          <p className={styles.body}>{body}</p>
        </Card>
      )}

      {extras.map(([key, value]) => (
        <Card key={key}>
          <p className={styles.cardLabel}>{key.replace(/_/g, ' ')}</p>
          <p className={styles.body}>{value}</p>
        </Card>
      ))}
    </div>
  )
}
