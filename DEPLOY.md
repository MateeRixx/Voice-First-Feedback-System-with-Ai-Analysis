# TrueTone — Deployment Plan

## Architecture

```
[Cloudflare Pages]               ← Frontend (React SPA, static build)
        ↕ REST API (CORS)
[Render]                         ← Backend (Express + TS, runs via tsx)
        ↕
[Neon PostgreSQL]                 ← Database + Queue (pg-boss uses same DB)
[Cloudinary]                      ← Audio storage (signed upload flow)
[Sarvam AI]                       ← Speech-to-text
[OpenRouter]                      ← AI insights (summary, sentiment, tags)
```

## Key Architecture Decisions (cost-driven)

| Requirement | Chosen Solution | Why |
|------------|----------------|-----|
| Queue | pg-boss (PostgreSQL) | No need for Redis — pg-boss uses the same DB, saving $0/mo |
| Audio storage | Cloudinary | Free 25GB tier, no credit card required |
| Transcription | Sarvam AI | Free 1000 min/month |
| AI analysis | OpenRouter (free models) | Free Mistral/Llama models |

## What Changes for Production

### No code changes needed — env vars only:

| Variable | Where to Set | Production Value |
|----------|-------------|-----------------|
| `VITE_API_URL` | Cloudflare Pages → Env vars | `https://truetone-api.onrender.com/api` |
| `CORS_ORIGIN` | Render → Env vars | `https://truetone.pages.dev` |
| `DATABASE_URL` | Render → Env vars | Neon pooled connection string |
| `JWT_SECRET` | Render → Env vars | `openssl rand -base64 32` |
| `CLOUDINARY_*` | Render → Env vars | Existing Cloudinary creds |
| `SARVAM_API` | Render → Env vars | Existing Sarvam key(s) |
| `OPEN_ROUTER_API` | Render → Env vars | Existing OpenRouter key |

The client uses `import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api"` — set the env var in Cloudflare Pages to override the dev fallback.

The server reads `CORS_ORIGIN` (comma-separated) or falls back to localhost origins — set it in Render to allow your production frontend URL.

## Step-by-Step

### 1. Database — Neon (free)

1. Go to [neon.tech](https://neon.tech) → Sign up → Create project `truetone`
2. Copy the pooled connection string (includes `?pgbouncer=true`)
3. This goes in `DATABASE_URL` on Render

### 2. File Storage — Cloudinary (already configured)

Your cloud: `dujqqwfym` — keep the existing API key + secret.

### 3. Backend — Render (free)

1. Render dashboard → New Web Service → Connect repo
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && npx tsx src/index.ts`
   - **Plan:** Free (512MB)
3. Set all env vars in Render dashboard
4. Deploy — first deploy will run migrations via the start command

**Cold start:** Render free tier sleeps after 15 min inactivity. First request after sleep takes ~30s. Mitigate with cron-job.org (free) pinging every 5 min.

### 4. Frontend — Cloudflare Pages (free)

1. Cloudflare Pages → Create project → Connect repo
2. Settings:
   - **Build command:** `cd client && npm ci && npm run build`
   - **Build output:** `client/dist`
   - **Env var:** `VITE_API_URL=https://truetone-api.onrender.com/api`
3. Deploy

### 5. Verify End-to-End

1. Register an account
2. Create a survey → Publish
3. Open the public survey link → submit a voice response
4. Check the response appears in the dashboard
5. Run AI analysis on the survey
6. View analytics with sentiment charts

## CI/CD — GitHub Actions

`.github/workflows/ci.yml` already exists. It:
- Sets up PostgreSQL
- Runs Prisma migrations
- Runs `npm test` (server vitest suite)

## Post-Deployment Checklist

- [ ] `.env` is gitignored (verify: `git check-ignore server/.env`)
- [ ] `VITE_API_URL` set in Cloudflare Pages
- [ ] `CORS_ORIGIN` set in Render (e.g. `https://truetone.pages.dev`)
- [ ] `JWT_SECRET` is a fresh random string (not the dev default)
- [ ] Database migrations ran on first deploy
- [ ] Cron job set up to prevent Render sleep
- [ ] Test a full flow: register → create survey → respond → analyze
