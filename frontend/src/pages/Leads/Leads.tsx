import { LeadTable } from '../../components'
import { useAppStore } from '../../store'
import styles from './Leads.module.css'

export function Leads() {
  const leads = useAppStore(s => s.leads)

  if (!leads.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No leads yet</p>
        <p className={styles.emptySub}>Run a campaign from the Dashboard first.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>{leads.length} leads found</p>
        <h1 className={styles.title}>Results</h1>
      </div>
      <LeadTable leads={leads} />
    </div>
  )
}
