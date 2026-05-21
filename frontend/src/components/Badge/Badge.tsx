import styles from './Badge.module.css'

type BadgeVariant = 'gold' | 'silver' | 'emerald' | 'rose' | 'violet' | 'default'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ label, variant = 'default', dot = false }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {dot && <span className={styles.dot} />}
      {label}
    </span>
  )
}
