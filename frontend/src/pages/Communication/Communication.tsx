import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Input } from '../../components'
import { CommunicationResponse } from '../../types'
import { useAppStore } from '../../store'
import { api } from '../../utils/api'
import styles from './Communication.module.css'

export function Communication() {
  const [params] = useSearchParams()
  const leadId = params.get('leadId')

  const leads = useAppStore(s => s.leads)
  const lead = leads.find(l => (l.lead_id ?? l.id) === leadId) ?? null

  const [product, setProduct] = useState('')
  const [whyBetter, setWhyBetter] = useState('')
  const [type, setType] = useState<'email' | 'phone_script'>('email')
  const [result, setResult] = useState<CommunicationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.generateCommunication({
        product,
        lead_name: lead?.name ?? '',
        lead_title: lead?.title ?? '',
        lead_company: lead?.company ?? '',
        lead_context: lead?.signal_context ?? '',
        lead_data: lead ?? undefined,
        type,
        why_better: whyBetter || undefined,
      }) as CommunicationResponse
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className="label" style={{ color: 'var(--color-primary-400)' }}>Communication</p>
        <h1 className="heading-md">{lead ? `Reach out to ${lead.name}` : 'Generate Outreach'}</h1>
      </div>

      <Card className={styles.form}>
        <Input label="Product / Service" value={product} onChange={e => setProduct(e.target.value)} />
        <Input label="Why better than competitors? (optional)" value={whyBetter} onChange={e => setWhyBetter(e.target.value)} placeholder="e.g. ex-Google engineers, available immediately" />

        <div className={styles.typeToggle}>
          <button className={`${styles.toggle} ${type === 'email' ? styles.toggleActive : ''}`} onClick={() => setType('email')}>Email</button>
          <button className={`${styles.toggle} ${type === 'phone_script' ? styles.toggleActive : ''}`} onClick={() => setType('phone_script')}>Phone Script</button>
        </div>

        {error && <p className="body-sm" style={{ color: 'var(--color-rose-500)' }}>{error}</p>}
        <Button onClick={generate} loading={loading}>Generate</Button>
      </Card>

      {result?.email && (
        <Card>
          <div className={styles.resultHeader}>
            <p className="label" style={{ color: 'var(--color-text-muted)' }}>Email</p>
            <Button variant="secondary" size="sm" onClick={() => copy(`Subject: ${result.email!.subject}\n\n${result.email!.body}`)}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p style={{ fontWeight: 500, marginBottom: 10 }}>{result.email.subject}</p>
          <div className={styles.goldLine} />
          <p className="body-sm" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', marginTop: 12 }}>{result.email.body}</p>
        </Card>
      )}

      {result?.phone_script && (
        <div className={styles.scriptSections}>
          {[
            { label: 'Opening', content: result.phone_script.opening },
            { label: 'Value Proposition', content: result.phone_script.value_proposition },
            { label: 'Objection Handling', content: result.phone_script.objection_handling },
            { label: 'Closing', content: result.phone_script.closing },
          ].map(({ label, content }) => (
            <Card key={label}>
              <p className="label" style={{ color: 'var(--color-text-muted)', marginBottom: 8 }}>{label}</p>
              <p className="body-sm" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{content}</p>
            </Card>
          ))}
          <Card>
            <div className={styles.resultHeader}>
              <p className="label" style={{ color: 'var(--color-text-muted)' }}>Full Script</p>
              <Button variant="secondary" size="sm" onClick={() => copy(result.phone_script!.full_script)}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="body-sm" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{result.phone_script.full_script}</p>
          </Card>
        </div>
      )}
    </div>
  )
}
