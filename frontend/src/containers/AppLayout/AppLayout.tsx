import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChatPanel } from '../../components/ChatPanel'
import { useAppStore } from '../../store'
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

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'

  const [collapsed, setCollapsed] = useState(false)

  const chatPanelVisible = useAppStore(s => s.chatPanelVisible)
  const chatMode = useAppStore(s => s.chatMode)
  const resetSession = useAppStore(s => s.resetSession)

  function handleNewChat() {
    resetSession()
    navigate('/')
  }

  return (
    <div className={styles.root}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>

        {/* Header row: brand + toggle */}
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

        {/* Nav */}
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

        <div className={styles.silverLine} />

        {/* Start New Chat */}
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

      </aside>

      <main className={`${styles.main} ${isHome ? styles.mainFull : ''} ${chatPanelVisible && chatMode === 'static' ? styles.mainWithChat : ''}`}>
        <Outlet />
      </main>

      {chatPanelVisible && <ChatPanel />}
    </div>
  )
}
