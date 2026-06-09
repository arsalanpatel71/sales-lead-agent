export interface OutreachEmail {
  subject: string
  body: string
  personalization_hook?: string
}

export interface Lead {
  id: string
  lead_id?: string
  first_name: string
  last_name: string
  name: string
  title: string
  company: string
  company_website?: string
  linkedin_url?: string
  email?: string
  email_status?: string
  score: number
  signal_type: string
  signal_strength?: string
  signal_context?: string
  signal_query?: string
  outreach?: OutreachEmail
}

export interface CommunicationRequest {
  product: string
  lead_name: string
  lead_title?: string
  lead_company?: string
  lead_context?: string
  lead_data?: Lead
  type: 'email' | 'phone_script'
  why_better?: string
}

export interface EmailOutput {
  subject: string
  body: string
}

export interface PhoneScriptOutput {
  opening: string
  value_proposition: string
  objection_handling: string
  closing: string
  full_script: string
}

export interface CommunicationResponse {
  type: string
  email?: EmailOutput
  phone_script?: PhoneScriptOutput
}

export type Intent = 'lead_search' | 'outreach' | 'conversation'

export interface OutreachResult {
  subject?: string
  body?: string
  personalization_hook?: string
  [key: string]: unknown
}

export interface ChatResponse {
  intent: Intent
  response: string
  session_id: string
  leads?: Lead[]
  total?: number
  leads_id?: string
  outreach?: OutreachResult | null
}

export type SignalStrength = 'strong' | 'weak'
export type CommunicationType = 'email' | 'phone_script'
export type ChatMode = 'static' | 'floating'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  leadsId?: string
  leadsCount?: number
}

// History / session types
export interface SessionSummary {
  session_id: string
  title: string
  lead_count: number
  turn_count: number
  created_at?: string
  updated_at?: string
}

export interface SessionsPage {
  items: SessionSummary[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
  leads_id?: string
  leads_count?: number
  created_at?: string
}
