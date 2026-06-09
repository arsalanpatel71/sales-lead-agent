import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChatPanel } from '../../components/ChatPanel'
import { useAppStore } from '../../store'
import { navigate as storeNavigate } from '../../utils/navigation'
import styles from './AppLayout.module.css'

const NAV = [
  {
    to: '/',
    label: 'Campaign',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/communicate',
    label: 'Communicate',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M13.5 2.5H2.5C1.95 2.5 1.5 2.95 1.5 3.5V10.5C1.5 11.05 1.95 11.5 2.5 11.5H5.5L8 14L10.5 11.5H13.5C14.05 11.5 14.5 11.05 14.5 10.5V3.5C14.5 2.95 14.05 2.5 13.5 2.5Z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d={collapsed ? 'M4 2L8 6L4 10' : 'M8 2L4 6L8 10'}
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'

  const [collapsed, setCollapsed] = useState(false)

  const chatPanelVisible = useAppStore(s => s.chatPanelVisible)
  const chatMode = useAppStore(s => s.chatMode)
  const resetSession = useAppStore(s => s.resetSession)
  const sessions = useAppStore(s => s.sessions)
  const sessionsPage = useAppStore(s => s.sessionsPage)
  const sessionsTotalPages = useAppStore(s => s.sessionsTotalPages)
  const sessionsLoading = useAppStore(s => s.sessionsLoading)
  const loadSessions = useAppStore(s => s.loadSessions)
  const loadSession = useAppStore(s => s.loadSession)

  // Load history on mount
  useEffect(() => { loadSessions(1) }, [loadSessions])

  const isResultPage = pathname.startsWith('/leads') || pathname === '/lead' || pathname.startsWith('/outreach')
  const showFloatingChat = chatPanelVisible && isResultPage

  function handleNewChat() {
    resetSession()
    navigate('/')
  }

  async function handleSessionClick(sessionId: string) {
    await loadSession(sessionId)
    storeNavigate(`/chat/${sessionId}`)
  }

  return (
    <div className={styles.root}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>

        {/* Brand + collapse toggle */}
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <div className={styles.brand}>
              <span className={styles.companyName}>Maverick</span>
              <span className={styles.logoName}>Outbound AI</span>
            </div>
          )}
          <button
            className={styles.toggleBtn}
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
        </div>

        <div className={styles.goldLine} />

        {/* Nav links */}
        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className={styles.navIcon}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Start New Chat — sits right below the nav links */}
        <button
          className={styles.newChatBtn}
          onClick={handleNewChat}
          title={collapsed ? 'Start New Chat' : undefined}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5V13.5M1.5 7.5H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          {!collapsed && <span>Start New Chat</span>}
        </button>

        <div className={styles.silverLine} />

        {/* History list — grows to fill remaining space */}
        {!collapsed && (
          <div className={styles.historyList}>
            {sessionsLoading && <p className={styles.historyEmpty}>Loading…</p>}
            {!sessionsLoading && sessions.length === 0 && (
              <p className={styles.historyEmpty}>No past sessions yet.</p>
            )}
            {!sessionsLoading && sessions.map(s => (
              <button
                key={s.session_id}
                className={styles.sessionItem}
                onClick={() => handleSessionClick(s.session_id)}
              >
                <span className={styles.sessionTitle}>{s.title}</span>
                <div className={styles.sessionMeta}>
                  {s.lead_count > 0 && (
                    <span className={styles.sessionBadge}>{s.lead_count} leads</span>
                  )}
                  <span className={styles.sessionTime}>{relativeTime(s.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination — always pinned at the bottom */}
        {!collapsed && sessionsTotalPages > 1 && (
          <div className={styles.historyPagination}>
            <button
              className={styles.pageBtn}
              onClick={() => loadSessions(sessionsPage - 1)}
              disabled={sessionsPage <= 1 || sessionsLoading}
              title="Previous page"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className={styles.pageInfo}>{sessionsPage} / {sessionsTotalPages}</span>
            <button
              className={styles.pageBtn}
              onClick={() => loadSessions(sessionsPage + 1)}
              disabled={sessionsPage >= sessionsTotalPages || sessionsLoading}
              title="Next page"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

      </aside>

      <main className={`${styles.main} ${isHome ? styles.mainFull : ''} ${showFloatingChat && chatMode === 'static' ? styles.mainWithChat : ''}`}>
        <Outlet />
      </main>

      {showFloatingChat && <ChatPanel />}
    </div>
  )
}
