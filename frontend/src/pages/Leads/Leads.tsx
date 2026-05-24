import { useMemo, useState, useEffect } from 'react'
import { LeadTable, Pagination } from '../../components'
import { useAppStore } from '../../store'
import styles from './Leads.module.css'

const PAGE_SIZE = 12

export function Leads() {
  const leads = useAppStore(s => s.leads)
  const [page, setPage] = useState(1)

  // Reset to page 1 whenever the lead set changes
  useEffect(() => { setPage(1) }, [leads])

  const totalPages = Math.ceil(leads.length / PAGE_SIZE)
  const paginated = useMemo(
    () => leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [leads, page],
  )

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
      <LeadTable leads={paginated} />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={leads.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
