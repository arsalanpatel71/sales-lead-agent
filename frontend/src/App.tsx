import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './containers/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { LeadDetail } from './pages/LeadDetail'
import { Communication } from './pages/Communication'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/communicate" element={<Communication />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
