export function scoreColor(score: number): string {
  if (score >= 70) return 'var(--color-emerald-500)'
  if (score >= 50) return 'var(--color-primary-400)'
  return 'var(--color-secondary-500)'
}

export function signalLabel(strength?: string): string {
  if (strength === 'strong') return 'Strong Signal'
  if (strength === 'weak') return 'Weak Signal'
  return 'ICP Match'
}

export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}
