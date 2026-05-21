# Sales Lead Agent — Project Plan

## What We're Building

A Clay-like agentic sales lead platform. User enters a product they want to sell → system finds potential clients through ICP matching and intent signals → enriches with verified email → generates personalised outreach copy using the prospect's own words.

**Key differentiator:** Outreach writes itself. When we find someone via an intent signal (they posted "anyone know a good X?"), that post becomes the context for the LLM-generated outreach. Cold ICP match is a guess; intent signal is a fact.

---

## Architecture Overview

### Discovery: Two Tracks

```
User inputs product
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                   DISCOVERY LAYER                     │
│                                                       │
│  Track 1: ICP Match          Track 2: Intent Signals  │
│  (who SHOULD need it)        (who IS looking for it)  │
│                                                       │
│  • Apollo people search      • LinkedIn post search   │
│    by title/industry/size      "anyone recommend X?"  │
│                                                       │
│  • Apollo company search     • Reddit API             │
│    by tech stack/keywords      r/[niche] discussions  │
│                                                       │
│  • Google SERP               • Serper.dev AI mode     │
│    niche directories           "looking for X"        │
│                                                       │
│                              • Twitter/X (optional)   │
│                                pain point mentions    │
└──────────────┬────────────────────────┬───────────────┘
               │                        │
               ▼                        ▼
        score: 30–40               score: 55–60
               │                        │
               └────────────┬───────────┘
                            │ merge + dedupe + score
                            ▼
                     Enrichment Layer
                (email, company info, title)
                            │
                            ▼
                    Email Verification
                            │
                            ▼
                  Outreach Copy (LLM)
                  context = intent post
```

### Scoring Model

```
Lead Score = ICP Fit (40%) + Intent Signal (60%)

Intent signal weights:
  LinkedIn post about the problem     → +60
  Reddit post asking for recs         → +55
  Mentioned in SERP buying guide      → +40
  Apollo ICP match only               → +30
  Multiple signals on same person     → bonus +10

Intent-track leads always surface first.
```

---

## Service Integration Sheet

> **V1 Active = Apollo + NeverBounce only.**
> All other services are architected in but not yet wired. Add them as APIs become available.

| Layer | Service | Status | API Key Env Var | Notes |
|---|---|---|---|---|
| ICP discovery | Apollo | **V1 ACTIVE** | `APOLLO_API_KEY` | People + company search |
| Email enrichment | Apollo | **V1 ACTIVE** | `APOLLO_API_KEY` | Same API, same call |
| Email verification | NeverBounce | **V1 ACTIVE** | `NEVERBOUNCE_API_KEY` | Protect domain reputation |
| Intent — professional | LinkedIn RapidAPI | Planned V2 | `RAPIDAPI_KEY` | Post search for buying signals |
| Intent — community | Reddit API | Planned V2 | `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | Free, high-intent discussions |
| Intent — web | Serper.dev | Planned V2 | `SERPER_API_KEY` | SERP + AI overview mode |
| Intent — social | Twitter/X API | Planned V3 | `TWITTER_BEARER_TOKEN` | Only for SaaS/dev tool niches |
| Company intel | Crunchbase | Planned V2 | `CRUNCHBASE_API_KEY` | Funding rounds, headcount |
| Outreach copy | LLM via Agent Builder | **V1 ACTIVE** | (uses sales-ai backend) | Personalised using intent post as context |

---

## Agent Architecture

The sales agent backend (`sales_agent/backend`) does NOT run its own LLM. It calls the **Agent Builder** (`sales-ai` backend) via WebSocket/REST using a configured `SALES_AGENT_ID`.

The Agent Builder agent is configured with:
- **Role:** Sales intelligence researcher
- **Goal:** Given a product and ICP, find high-intent leads with verified emails and write personalised outreach
- **Instructions:** (see agent config in sales-ai dashboard)

All discovery, scoring, and enrichment logic lives in `sales_agent/backend/services/`. The agent receives the enriched lead data as context and generates outreach copy.

---

## V1 Scope — Apollo End-to-End

### What V1 delivers
1. User enters product + ICP description (title, industry, company size)
2. Apollo people search → returns matching prospects
3. Apollo email enrichment → get email per prospect
4. NeverBounce → verify email, discard bounces
5. LLM → generate personalised outreach email per verified lead
6. Frontend displays lead list + outreach draft, user can copy/send

### What V1 explicitly defers
- Intent signal tracks (LinkedIn, Reddit, Serper)
- Lead scoring beyond Apollo match quality
- CRM integration
- Bulk export
- Email sending (just generation for now)

---

## Backend Service Structure (Planned)

```
backend/
├── app.py
├── settings.py
├── routes/
│   ├── chat.py          # Agent chat proxy (existing)
│   └── leads.py         # Lead generation endpoints (to build)
├── services/
│   ├── agent_client.py  # Agent Builder proxy (existing)
│   ├── discovery/
│   │   ├── apollo.py        # V1 ACTIVE — people/company search
│   │   ├── linkedin.py      # Planned V2
│   │   ├── reddit.py        # Planned V2
│   │   └── serper.py        # Planned V2
│   ├── enrichment/
│   │   └── apollo.py        # V1 ACTIVE — email enrichment
│   ├── verification/
│   │   └── neverbounce.py   # V1 ACTIVE — email verification
│   ├── scoring.py           # Lead score calculator
│   └── outreach.py          # LLM outreach copy via agent
└── models/
    └── lead.py              # Lead Pydantic model
```

---

## Frontend Pages (Planned)

| Page | Route | Description |
|---|---|---|
| New Campaign | `/` | Product input + ICP fields, kick off search |
| Leads | `/leads` | Scored lead list, filter by signal type |
| Lead Detail | `/leads/:id` | Full profile + outreach draft + copy button |
| Settings | `/settings` | API key status, agent config |

---

## Environment Variables

### Backend (`.env`)
```
# Agent Builder
AGENT_BUILDER_URL=https://agent-builder-3km3.onrender.com
AGENT_BUILDER_WS_URL=wss://agent-builder-3km3.onrender.com
SALES_AGENT_ID=

# V1 Active
APOLLO_API_KEY=
NEVERBOUNCE_API_KEY=

# Planned V2
RAPIDAPI_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
SERPER_API_KEY=

# Planned V3
TWITTER_BEARER_TOKEN=
CRUNCHBASE_API_KEY=
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8002
VITE_WS_URL=ws://localhost:8002
```
