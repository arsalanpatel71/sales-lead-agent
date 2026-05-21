import styles from './Spinner.module.css'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className={styles.wrapper}>
      <span className={`${styles.ring} ${styles[size]}`} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  )
}
