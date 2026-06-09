import { Lead } from '../../types'
import { navigate } from '../../utils/navigation'
import { scoreColor, signalLabel } from '../../utils/formatters'
import styles from './LeadTable.module.css'

interface Props {
  leads: Lead[]
  leadsId: string
}

export function LeadTable({ leads, leadsId }: Props) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.th}>Name</th>
          <th className={styles.th}>Role</th>
          <th className={styles.th}>Source</th>
          <th className={styles.th}>Signal</th>
          <th className={styles.th}>Score</th>
          <th className={styles.th}>Email</th>
        </tr>
      </thead>
      <tbody>
        {leads.map(lead => (
          <tr
            key={lead.lead_id ?? lead.id}
            className={styles.row}
            onClick={() => navigate(`/lead?leads_id=${leadsId}&lead_id=${encodeURIComponent(lead.lead_id ?? lead.id)}`)}
          >
            <td className={styles.td}>
              <div className={styles.nameCell}>
                <div className={styles.avatar}>
                  {(lead.name || '?')[0].toUpperCase()}
                </div>
                <span className={styles.name}>{lead.name}</span>
              </div>
            </td>
            <td className={styles.td}>
              <span className={styles.role}>
                {lead.title}{lead.company ? ` · ${lead.company}` : ''}
              </span>
            </td>
            <td className={styles.td}>
              <span className={`${styles.sourceBadge} ${lead.signal_type === 'linkedin_post' ? styles.linkedin : styles.apollo}`}>
                {lead.signal_type === 'linkedin_post' ? 'LinkedIn' : 'Apollo'}
              </span>
            </td>
            <td className={styles.td}>
              <span className={`${styles.badge} ${lead.signal_strength === 'strong' ? styles.strong : styles.weak}`}>
                {signalLabel(lead.signal_strength)}
              </span>
            </td>
            <td className={styles.td}>
              <span className={styles.score} style={{ color: scoreColor(lead.score) }}>
                {lead.score}
              </span>
            </td>
            <td className={styles.td}>
              <span className={styles.email}>{lead.email ?? '—'}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
