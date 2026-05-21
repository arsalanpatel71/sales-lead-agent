import styles from './OrbitLoader.module.css'

const STEPS = [
  'Analyzing product…',
  'Building ideal customer profile…',
  'Searching LinkedIn signals…',
  'Enriching lead data…',
  'Verifying contact emails…',
  'Compiling results…',
]

export function OrbitLoader({ currentStep }: { currentStep: number }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.orbit}>
        <div className={styles.core} />
        <div className={styles.ring1}>
          <span className={styles.ring1Dot} />
        </div>
        <div className={styles.ring2}>
          <span className={styles.ring2Dot} />
          <span className={`${styles.ring2Dot} ${styles.ring2DotB}`} />
        </div>
        <div className={styles.ring3}>
          <span className={styles.ring3Dot} />
        </div>
      </div>
      <ul className={styles.steps}>
        {STEPS.map((step, i) => (
          <li
            key={i}
            className={[
              styles.step,
              i <= currentStep ? styles.visible : '',
              i === currentStep ? styles.current : '',
              i < currentStep ? styles.done : '',
            ].join(' ')}
          >
            <span className={styles.stepIcon}>{i < currentStep ? '✓' : '○'}</span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  )
}
