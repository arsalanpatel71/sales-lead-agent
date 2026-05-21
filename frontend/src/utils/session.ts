const SESSION_KEY = 'sa_session_id'

/** Returns a stable UUID for this browser session. Generated once, stored in sessionStorage. */
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
