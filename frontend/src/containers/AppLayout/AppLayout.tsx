import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChatPanel } from '../../components/ChatPanel'
import { useChatContext } from '../../context/ChatContext'
import styles from './AppLayout.module.css'

const NAV = [
  { to: '/',            label: 'Campaign' },
  { to: '/communicate', label: 'Communicate' },
]

export function AppLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const { chatPanelVisible, chatMode, setChatMode, messages, sendChat, chatResponding } = useChatContext()

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className="heading-sm" style={{ color: 'var(--color-primary-400)' }}>Sales</span>
          <span className="heading-sm" style={{ color: 'var(--color-text-secondary)' }}>Agent</span>
        </div>
        <div className={styles.goldLine} />
        <nav className={styles.nav}>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.silverLine} />
      </aside>
      <main className={`${styles.main} ${isHome ? styles.mainFull : ''} ${chatPanelVisible && chatMode === 'static' ? styles.mainWithChat : ''}`}>
        <Outlet />
      </main>
      {chatPanelVisible && (
        <ChatPanel
          mode={chatMode}
          messages={messages}
          onSend={sendChat}
          onModeChange={setChatMode}
          responding={chatResponding}
        />
      )}
    </div>
  )
}
