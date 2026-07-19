# TrueTone

**Voice feedback platform with AI-powered analysis.**

Collect voice and text feedback via shareable survey links. Each response is transcribed (Sarvam AI) and analyzed (OpenRouter) for sentiment, urgency, and topics — displayed on a dashboard with Recharts visualizations.

---

## Architecture

```
[React SPA] → REST API → [Express + TS]
                              ↕
                      [PostgreSQL + pg-boss]
                              ↕
              ┌───────────────┼───────────────┐
         [Cloudinary]    [Sarvam AI]    [OpenRouter]
         (audio storage)  (STT)          (LLM insights)
```

- **pg-boss** for async job queue (no Redis — saves $0/mo on free tier)
- **Cloudinary** for signed audio uploads (free 25GB tier)
- **Sarvam AI** for speech-to-text (free 1000 min/month)
- **OpenRouter** for LLM analysis via free Mistral/Llama models

---

## Features

- Survey CRUD with publish/draft workflow
- Voice recording via browser MediaRecorder + Cloudinary signed upload
- Text-only feedback fallback
- Async processing pipeline: transcribe → AI analysis (sentiment, urgency, tags)
- Dashboard with overview stats, per-survey response list, and Analytics page (sentiment donut chart + urgency bar chart via Recharts)
- Public survey submission (no login required)
- Rate limiting (20 req/min public, 10 req/min auth)
- JWT auth with bcrypt (12 rounds)
- Helmet, CORS allowlisting, SSRF host validation, generic error responses

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, React Router |
| Backend | Express, TypeScript, Prisma ORM, pg-boss |
| Database | PostgreSQL (Neon) |
| Storage | Cloudinary |
| AI | Sarvam AI (STT), OpenRouter (LLM) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Cloudinary account
- Sarvam AI API key(s)
- OpenRouter API key

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd truetone
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cp server/.env.example server/.env    # fill in your keys
cp client/.env.example client/.env    # defaults to localhost:3000

# 3. Database
cd server
npx prisma migrate dev
npx prisma db seed   # optional

# 4. Run
# terminal 1 — server
cd server && npx tsx src/index.ts

# terminal 2 — client
cd client && npm run dev
```

### Tests

```bash
cd server && npx vitest run     # 29 tests
```

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions for Render (backend) + Cloudflare Pages (frontend) + Neon (database).

---

## Key Design Decisions

- **pg-boss over Redis:** The queue uses the same PostgreSQL database, eliminating a separate Redis instance. Cost-driven choice for free-tier hosting.
- **Cloudinary over R2/S3:** Free 25GB tier with no credit card required. Signed uploads keep the API secret server-side.
- **Sarvam AI:** Free tier covers 1000 minutes/month, sufficient for demo/portfolio usage.
- **OpenRouter free models:** Access to Mistral, Llama, and other free models without a dedicated API subscription.
