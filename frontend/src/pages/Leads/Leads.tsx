import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LeadTable, Pagination } from '../../components'
import { useAppStore } from '../../store'
import { navigate } from '../../utils/navigation'
import styles from './Leads.module.css'

const PAGE_SIZE = 12

export function Leads() {
  const [searchParams] = useSearchParams()
  const leadsId = searchParams.get('leads_id') ?? ''

  const sessionId = useAppStore(s => s.sessionId)
  const leads = useAppStore(s => s.leads)
  const [page, setPage] = useState(1)

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
        <div className={styles.headerLeft}>
          {sessionId && (
            <button
              className={styles.backBtn}
              onClick={() => navigate(`/chat/${sessionId}`)}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8 2L4 6.5L8 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Chat
            </button>
          )}
          <div>
            <p className={styles.label}>{leads.length} leads found</p>
            <h1 className={styles.title}>Results</h1>
          </div>
        </div>
      </div>
      <LeadTable leads={paginated} leadsId={leadsId} />
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
