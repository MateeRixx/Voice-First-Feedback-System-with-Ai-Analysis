# Voice Feedback System — Product Requirements Document (PRD)

**Owner:** Sum (Mohit Kumar)
**Version:** 1.0
**Status:** Draft for build
**Doc type:** Agent-buildable PRD (structured for an AI coding agent + human reviewer)

---

## 1. Product Overview

### 1.1 What we're building
A multi-tenant SaaS platform where organizations create voice-first feedback surveys, share a public link, collect spoken (and optional text) responses from anyone, and get AI-generated transcripts, summaries, sentiment, and insights in a dashboard.

### 1.2 Problem statement
Traditional feedback forms have low completion rates and shallow signal — a 1–5 star rating or a text box people don't bother filling. Voice responses are faster to give, capture tone and emotion, and produce richer qualitative data once transcribed and summarized by AI.

### 1.3 Target users
- **Admin / Org Owner** — creates surveys, shares links, reviews responses, reads AI insights.
- **Team member** (future) — invited collaborator with restricted permissions.
- **Respondent** — anonymous public user who lands on a survey link and leaves a voice/text response. No login required.

### 1.4 Success metrics (MVP)
- Survey creation to first response < 5 minutes end-to-end.
- Public survey page loads in < 2s on 4G, recording starts in < 300ms after tap.
- Transcription job completes in < 30s for a 60s clip (p95).
- Zero data loss on upload failure (resumable/retryable upload).

---

## 2. Design Principles (2026 UI/UX bar)

The product should feel like a modern, opinionated SaaS tool (think Linear, Vercel dashboard, Cal.com), not a generic CRUD admin panel. Concretely:

- **Motion with purpose.** Micro-interactions on record/stop/submit (waveform pulsing while recording, spring-based transitions between states) — never decorative-only, every animation should communicate state change. Respect `prefers-reduced-motion`.
- **Voice-native UI.** A live waveform or amplitude visualizer during recording, not just a spinning icon. Recording state should be unmistakable (color + icon + motion + on-screen timer).
- **Skeleton loading everywhere**, not spinners, for dashboard lists, response tables, and insight cards.
- **Empty states are designed, not blank.** "No responses yet" should include an illustration/icon, a copy-the-link CTA, and a short tip.
- **Dark mode is a first-class theme**, not an afterthought — respect system preference, allow manual override, persist choice.
- **Accessibility (WCAG 2.2 AA) is a requirement, not a nice-to-have**: keyboard-navigable survey builder, screen-reader labels on the audio recorder (state changes announced via `aria-live`), sufficient contrast, focus-visible states, captions/transcript always available as a text alternative to audio.
- **Mobile-first for the public survey page.** Most respondents will open the link from a phone (SMS/WhatsApp/QR code). The admin dashboard can be desktop-optimized but must remain usable on tablet.
- **AI output is presented as scannable, not a wall of text** — insight cards with sentiment badges, tag chips, urgency indicators (color-coded), and a one-line AI summary before the full transcript (progressive disclosure).
- **Design system discipline.** Shadcn UI primitives + Tailwind tokens (spacing, radius, color) defined once in `tailwind.config` / CSS variables — no ad hoc magic numbers in components.

---

## 3. Tech Stack (confirmed)

| Layer | Choice |
|---|---|
| Frontend | React + Vite, Tailwind CSS, Shadcn UI |
| Backend | Express (TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Session or JWT-based (custom) |
| File storage | Cloudflare R2 (S3-compatible) |
| Queue / worker | Redis + BullMQ |
| Transcription | Whisper API (or equivalent) |
| AI insights | Claude API (structured JSON output — summary, sentiment, tags, urgency) |
| Charts | Recharts |
| Forms/validation | React Hook Form + Zod (shared schemas between client and server) |

**Deployment target:** containerized (Docker) — API + worker as separate services, Postgres and Redis as managed instances, R2 for object storage, frontend as static build behind a CDN.

---

## 4. Data Model

### 4.1 Entities

```
Organization
  id, name, slug, createdAt

User
  id, orgId (FK), email, passwordHash, role (OWNER | ADMIN | MEMBER), createdAt

Survey
  id, orgId (FK), title, subtitle, slug (public link), voiceDurationLimitSec,
  theme (JSON: colors/background), textFeedbackEnabled (bool),
  status (DRAFT | PUBLISHED | ARCHIVED), createdAt, updatedAt

SurveyResponse
  id, surveyId (FK), respondentMeta (JSON: userAgent, locale — no PII by default),
  textFeedback (nullable), durationSec, status (PENDING | PROCESSED | FAILED), createdAt

ResponseAttachment
  id, responseId (FK, 1:1), storageKey, mimeType, sizeBytes, r2Url

Transcript
  id, responseId (FK, 1:1), text, language, confidence, createdAt

AIInsight
  id, responseId (FK, 1:1), summary, sentiment (POSITIVE|NEUTRAL|NEGATIVE|MIXED),
  urgency (LOW|MEDIUM|HIGH), tags (string[]), rawModelOutput (JSON), createdAt
```

### 4.2 Relationships
- `Organization` 1—N `User`
- `Organization` 1—N `Survey`
- `Survey` 1—N `SurveyResponse`
- `SurveyResponse` 1—0/1 `ResponseAttachment`
- `SurveyResponse` 1—0/1 `Transcript`
- `SurveyResponse` 1—0/1 `AIInsight`

### 4.3 Indexing notes
- Index `Survey.slug` (unique) for public link lookups.
- Index `SurveyResponse.surveyId, createdAt` for paginated dashboard queries.
- Index `AIInsight.sentiment`, `AIInsight.urgency` for dashboard filtering.

---

## 5. Functional Requirements

### 5.1 Auth
- Register (org + first admin user created together).
- Login / logout.
- Protected dashboard routes (middleware-based, redirect to login).
- Password hashing with bcrypt/argon2; rate-limit login attempts.

**Acceptance criteria:** unauthenticated access to any `/dashboard/*` route redirects to `/login`; session/JWT expires and forces re-auth; passwords never logged or returned in API responses.

### 5.2 Survey Builder
- Create / edit survey: title, subtitle, voice duration limit, theme (color + background), text-feedback toggle.
- Autosave draft or explicit save with unsaved-changes guard.
- Publish/unpublish toggle generates/revokes the public shareable link.
- Survey list view with status badges (Draft/Published/Archived), response count per survey, last response date.

**Acceptance criteria:** a saved survey persists all fields correctly on reload; publishing generates a working public URL immediately; unpublishing returns a "survey not available" state on the public page.

### 5.3 Public Survey Page
- Loads survey by slug; shows title, subtitle, and org branding/theme.
- Voice recorder: request mic permission → record → live waveform + timer → stop (auto-stop at duration limit) → preview playback → re-record option → submit.
- Optional text feedback field (shown only if enabled on survey).
- Submission triggers upload with progress indicator; success/error state; thank-you screen after submit.
- Graceful fallback if mic permission denied (clear message + option to leave text-only feedback if enabled).

**Acceptance criteria:** works on iOS Safari and Android Chrome mic APIs; recording never silently fails; a network drop during upload is retryable without losing the recorded clip (kept in memory/local state until confirmed uploaded).

### 5.4 Response Management (Admin)
- Paginated list: date, duration, status (processing/ready/failed), sentiment badge (once available).
- Inline audio player with waveform seek.
- Transcript view (collapsed by default, expandable).
- Filters: date range, sentiment, urgency, has-text-feedback.
- Search over transcript text (Phase 2).

**Acceptance criteria:** list paginates without full page reload; audio player supports scrub/seek and doesn't re-fetch the file on every play.

### 5.5 AI Processing Pipeline
1. Audio uploaded directly to R2 (via signed URL) on submit.
2. API creates `SurveyResponse` + `ResponseAttachment` records, enqueues a BullMQ transcription job.
3. Worker fetches audio, calls Whisper API, saves `Transcript`.
4. Worker calls Claude API with transcript (+ optional text feedback) for structured JSON: `{ summary, sentiment, urgency, tags }`, saves `AIInsight`.
5. Response `status` updated to `PROCESSED`; dashboard reflects new status (poll or websocket/SSE).
6. On failure at any step: retry with backoff (BullMQ built-in), mark `FAILED` after max retries, surface a "reprocess" action to the admin.

**Acceptance criteria:** a failed transcription doesn't block other jobs in the queue; admin can manually retry a failed response; raw model output is stored for auditability/debugging.

### 5.6 Analytics Dashboard
- Total response count, response trend over time (line/bar chart via Recharts).
- Sentiment distribution (donut/bar).
- Urgency breakdown with a "needs attention" quick filter (high-urgency + negative sentiment surfaced first).
- Insight cards summarizing top themes/tags across recent responses.

**Acceptance criteria:** charts handle zero-data state gracefully (no broken/empty chart); data refrests without a full page reload after new responses arrive.

---

## 6. API Design (high level)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/surveys
POST   /api/surveys
GET    /api/surveys/:id
PATCH  /api/surveys/:id
POST   /api/surveys/:id/publish
POST   /api/surveys/:id/unpublish

GET    /api/public/surveys/:slug            (no auth)
POST   /api/public/surveys/:slug/upload-url (no auth — returns signed R2 URL)
POST   /api/public/surveys/:slug/responses  (no auth — creates response + enqueues job)

GET    /api/responses?surveyId=&page=&sentiment=&urgency=
GET    /api/responses/:id
POST   /api/responses/:id/reprocess

GET    /api/analytics/:surveyId
```

All authenticated routes scoped by `orgId` from the session/JWT — never trust a client-supplied `orgId`.

---

## 7. Non-Functional Requirements

- **Security:** signed, short-lived upload URLs; validate MIME type + size server-side (not just client-side) before accepting uploads; rate-limit public submission endpoint per IP to prevent spam/abuse; sanitize all user input; CORS locked to known origins; secrets in env vars, never committed.
- **Performance:** paginate all list endpoints; lazy-load audio (don't preload all clips on the response list); debounce autosave in survey builder.
- **Reliability:** idempotent upload/response creation (avoid duplicate responses on retry); BullMQ retry + dead-letter handling for permanently failed jobs.
- **Observability:** structured logging (request id, org id) on API and worker; job-level logging in BullMQ (queued/started/completed/failed); basic error tracking (e.g., Sentry) wired in from day one.
- **Accessibility:** WCAG 2.2 AA as described in §2.
- **Responsiveness:** public survey page mobile-first; dashboard responsive down to tablet width.

---

## 8. Software Engineering Practices

- **Type safety end-to-end:** shared Zod schemas for request/response validation, inferred TypeScript types reused on frontend and backend where practical.
- **Testing:**
  - Unit tests for pure logic (Zod schemas, utility functions, AI-response parsing).
  - Integration tests for API routes (auth, survey CRUD, response submission) against a test database.
  - Minimal E2E smoke test (Playwright) covering: create survey → publish → submit public response → see it in dashboard.
- **Code quality gates:** ESLint + Prettier + a pre-commit hook (Husky + lint-staged); CI runs lint + typecheck + tests on every PR.
- **Database migrations:** every schema change via `prisma migrate`, committed to version control, never hand-edited in production.
- **Environment config:** `.env.example` committed, real secrets only in deployment platform's secret manager.
- **Git hygiene:** small, atomic commits with conventional-commit-style messages (`feat:`, `fix:`, `chore:`); one feature per branch/PR.
- **Route/module organization:** feature-based folders (`/features/surveys`, `/features/responses`) rather than type-based (`/controllers`, `/models`) to keep related logic together as the app grows.
- **Reusable component library:** shadcn primitives wrapped in project-level components (`<AudioRecorder />`, `<SentimentBadge />`, `<InsightCard />`) so styling/behavior changes happen in one place.

---

## 9. Build Order (Phased)

### Phase 1 — SaaS Core
1. Project scaffolding: monorepo or `/client` + `/server`, shared types package, Prisma schema, CI skeleton.
2. Auth (register/login/logout, protected routes).
3. Dashboard shell (nav, layout, theme toggle).
4. Survey CRUD + survey list.
5. Public survey page (static content first, no recording yet).
6. Voice recording UI + R2 upload (signed URL flow) + response submission.
7. Response management (list, player, pagination).

### Phase 2 — AI Layer
8. BullMQ worker setup + Redis wiring.
9. Whisper transcription job.
10. Claude structured-insight job (summary/sentiment/urgency/tags).
11. Wire processed status + insights into the response detail view.
12. Analytics dashboard (charts + insight cards + filters).

### Phase 3 — Polish & Ship
13. Empty/loading/error states audit across every screen.
14. Accessibility pass (keyboard nav, screen reader labels, contrast check).
15. Responsive QA on real mobile devices for the public survey page.
16. Deployment (Docker, env setup, managed Postgres/Redis, R2 bucket + CDN for frontend).
17. README, screenshots, demo video, resume bullet points.

---

## 10. Definition of Done (per feature)
A feature is done only when:
- UI is complete with loading, empty, and error states.
- API endpoint(s) implemented and validated (Zod) on both ends.
- Data persists correctly and survives a page reload.
- It has at least one automated test (unit or integration).
- It works end-to-end manually on both desktop and mobile viewport.
- Commit history for the feature is clean and readable.

---

## 11. Final Deliverables
- README (setup instructions, architecture overview, env vars needed).
- Screenshots of dashboard, survey builder, public survey page, and insights view.
- Demo video (2–3 min walkthrough: create survey → respond → view AI insights).
- Deployment links (frontend + API).
- Resume bullet points summarizing the AI pipeline, multi-tenant architecture, and measurable outcomes (e.g., transcription latency, test coverage).

---

## 12. Open Questions / Future Considerations
- Team member roles/permissions beyond Owner/Admin (Phase 3+).
- Multiple survey types beyond voice+text (e.g., rating scales) — schema is intentionally left extensible (`Survey.theme` and future `Survey.type` field) for this.
- Full-text search over transcripts (Postgres `tsvector` or a dedicated search index) — flagged in Phase 2 scope but can slip to Phase 3 if time-constrained.
- Webhook/notification system for high-urgency negative feedback (Slack/email alert) — natural extension once AI insights are stable.