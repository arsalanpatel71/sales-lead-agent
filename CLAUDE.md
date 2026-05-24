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

---

## Pipeline Limits Reference

There are three separate, independent layers of limits. Do not confuse them.

### 1. ICP Agent — query generation
**File:** `utils/icp.py`, controlled by the ICP Agent Builder prompt.

The ICP agent receives the user's product query and returns structured JSON including `linkedin_intent_queries`. The agent prompt currently instructs it to generate **1 LinkedIn query**. This number is the multiplier for all downstream Apify calls — if you increase it to 3, you get 3× the Apify calls and 3× the posts.

- **Where to change:** ICP Agent Builder instructions (not in code) — edit the prompt to say "Generate N queries".
- `min_leads` is also extracted here if the user mentioned a count ("find me 20 leads"). If not mentioned, it is `null`.

### 2. Apify — posts returned per query call
**File:** `utils/apify.py` → `search_linkedin_posts()`
**Setting:** `APIFY_RESULTS_PER_QUERY` env var (default: `1` in `settings.py`)

One Apify HTTP call is made **per query** from step 1. The `limit` parameter on the Apify URL controls how many posts are returned per call.

```
total raw posts = number_of_queries × apify_results_per_query
                = 1               × 1                       = 1  (current defaults)
```

- **Where to change:** Set `APIFY_RESULTS_PER_QUERY=N` in `.env` (default: `20`).
- Apify timeout per call: **180 seconds**.

### 3. Post filter agent — batch size and batch cap
**File:** `utils/post_filter.py`

After Apify returns posts, they are sent to the post-filter agent in batches to decide which are genuine buying signals.

| Constant | Value | Meaning |
|---|---|---|
| `_BATCH_SIZE` | 20 | Posts per agent call |
| `_MAX_BATCHES` | 5 | Max batches processed |
| Effective cap | 100 posts | `_BATCH_SIZE × _MAX_BATCHES` |

Posts beyond 100 are silently dropped. Increase `_MAX_BATCHES` if you raise Apify volume.

### 4. LinkedIn service — people per company post
**File:** `linkedin_module/service.py`

When a filtered post comes from a **company** LinkedIn page (not a person), the service searches Apollo for ICP-matching people at that company.

| Constant | Value | Meaning |
|---|---|---|
| `_MAX_PEOPLE_PER_COMPANY` | 3 | Apollo people search per company post |

### 5. Apollo — pagination and per-page
**File:** `apollo_module/service.py`

Apollo is called in a loop until either `min_leads` is satisfied or `_MAX_PAGES` is exhausted.

| Constant / Variable | Value | Meaning |
|---|---|---|
| `_MAX_PAGES` | 5 | Max Apollo pagination rounds |
| `per_page` | `min(min_leads × 2, 50)` or `50` | Results requested per Apollo API call |
| Apollo API hard cap | 50 | Apollo never returns more than 50 per page |
| `min_leads` | from ICP agent or `null` | Loop exits when this many leads are found; `null` = run all `_MAX_PAGES` |

Max raw results from Apollo: `_MAX_PAGES × per_page = 5 × 50 = 250` (before email filtering).

### Full call budget (current defaults)
```
ICP agent:        1 call
Apify:            1 call  (1 query × 1 result each)
Post filter:      1 call  (≤20 posts → 1 batch)
Apollo:           up to 5 pagination calls
  └─ per lead:    1 enrich call + 1 NeverBounce call + 1 outreach agent call
```

Raising `APIFY_RESULTS_PER_QUERY` or the number of ICP queries is where the biggest volume gains are. Apollo is already near its practical ceiling at 5 pages × 50 results.
