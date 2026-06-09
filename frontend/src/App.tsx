import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { AppLayout } from './containers/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Chat } from './pages/Chat'
import { Leads } from './pages/Leads'
import { LeadDetail } from './pages/LeadDetail'
import { Outreach } from './pages/Outreach'
import { Communication } from './pages/Communication'
import { setNavigate } from './utils/navigation'

function NavBridge() {
  const navigate = useNavigate()
  useEffect(() => { setNavigate(navigate) }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBridge />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Chat — session ID in path */}
          <Route path="/chat/:sessionId" element={<Chat />} />

          {/* Leads list  — ?leads_id=<uuid> */}
          <Route path="/leads" element={<Leads />} />

          {/* Lead detail — ?leads_id=<uuid>&lead_id=<id> */}
          <Route path="/lead" element={<LeadDetail />} />

          {/* Outreach */}
          <Route path="/outreach/:sessionId" element={<Outreach />} />

          <Route path="/communicate" element={<Communication />} />

          {/* Catch old path-param URLs */}
          <Route path="/leads/:any" element={<Navigate to="/" replace />} />
          <Route path="/chat" element={<Navigate to="/" replace />} />
          <Route path="/outreach" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
