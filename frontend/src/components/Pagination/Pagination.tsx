import styles from './Pagination.module.css'

interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={styles.container}>
      <span className={styles.info}>
        {from}–{to} of {total} leads
      </span>

      <div className={styles.controls}>
        <button
          className={styles.navBtn}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ←
        </button>

        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className={styles.dots}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.active : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={styles.navBtn}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  )
}
