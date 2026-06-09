import type { NavigateFunction } from 'react-router-dom'

// A bridge so the Zustand store can navigate without React context.
// Set once from <NavBridge /> inside the router.
let _navigate: NavigateFunction | null = null

export function setNavigate(fn: NavigateFunction) {
  _navigate = fn
}

export function navigate(to: string) {
  _navigate?.(to)
}
