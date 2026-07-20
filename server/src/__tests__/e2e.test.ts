import "dotenv/config"
import { describe, it, beforeAll, expect } from "vitest"

const API = `http://127.0.0.1:${process.env.PORT || 3000}/api`

let token = ""
let surveyId = ""
let surveySlug = ""
let responseId = ""

async function api<T = Record<string, unknown>>(path: string, options?: RequestInit) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { ...options, headers })
  const body = await res.json().catch(() => ({})) as T
  return { status: res.status, body }
}

function withAuth<T>(fn: () => Promise<T>): Promise<T> {
  const saved = token
  token = ""
  return fn().finally(() => { token = saved })
}

// ─── Auth ───────────────────────────────────────────────────────────────

describe("Auth", () => {
  const testEmail = `test-${Date.now()}@truetone.dev`
  const testPassword = "TestPass123!"
  const testOrg = `TestOrg-${Date.now()}`

  it("POST /auth/register — creates org + user", async () => {
    const r = await api<{ token: string; user: { email: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail, password: testPassword, orgName: testOrg,
        securityQuestion: "What was the name of your first pet?",
        securityAnswer: "Fluffy",
      }),
    })
    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
    expect(r.body.user.email).toBe(testEmail)
    token = r.body.token
  })

  it("POST /auth/register — rejects duplicate email", async () => {
    const r = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail, password: testPassword, orgName: testOrg,
        securityQuestion: "What was the name of your first pet?",
        securityAnswer: "Fluffy",
      }),
    })
    expect(r.status).toBe(400)
  })

  it("POST /auth/login — returns token", async () => {
    const r = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    })
    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
    token = r.body.token
  })

  it("POST /auth/login — rejects wrong password", async () => {
    const r = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, password: "wrong" }),
    })
    expect(r.status).toBe(401)
  })
})

// ─── Surveys (authenticated) ───────────────────────────────────────────

describe("Surveys", () => {
  it("GET /surveys — empty list", async () => {
    const r = await api<{ surveys: unknown[] }>("/surveys")
    expect(r.status).toBe(200)
    expect(r.body.surveys).toEqual([])
  })

  it("POST /surveys — creates survey", async () => {
    const r = await api<{ survey: { id: string; title: string; slug: string } }>("/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: "Product Feedback Q3",
        subtitle: "Help us improve",
        voiceDurationLimitSec: 120,
        textFeedbackEnabled: true,
        theme: { welcomeMessage: "Speak freely!", thankYouMessage: "Thanks!" },
      }),
    })
    expect(r.status).toBe(201)
    expect(r.body.survey.title).toBe("Product Feedback Q3")
    surveyId = r.body.survey.id
    surveySlug = r.body.survey.slug
  })

  it("GET /surveys — returns created survey", async () => {
    const r = await api<{ surveys: unknown[] }>("/surveys")
    expect(r.status).toBe(200)
    expect(r.body.surveys.length).toBe(1)
  })

  it("GET /surveys/:id — returns survey detail", async () => {
    const r = await api<{ survey: { id: string } }>(`/surveys/${surveyId}`)
    expect(r.status).toBe(200)
    expect(r.body.survey.id).toBe(surveyId)
  })

  it("PATCH /surveys/:id — updates survey", async () => {
    const r = await api<{ survey: { title: string; voiceDurationLimitSec: number } }>(`/surveys/${surveyId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title", voiceDurationLimitSec: 60 }),
    })
    expect(r.status).toBe(200)
    expect(r.body.survey.title).toBe("Updated Title")
    expect(r.body.survey.voiceDurationLimitSec).toBe(60)
  })

  it("POST /surveys/:id/publish — publishes survey", async () => {
    const r = await api<{ survey: { status: string } }>(`/surveys/${surveyId}/publish`, { method: "POST" })
    expect(r.status).toBe(200)
    expect(r.body.survey.status).toBe("PUBLISHED")
  })

  it("POST /surveys/:id/unpublish — unpublishes survey", async () => {
    const r = await api<{ survey: { status: string } }>(`/surveys/${surveyId}/unpublish`, { method: "POST" })
    expect(r.status).toBe(200)
    expect(r.body.survey.status).toBe("DRAFT")
  })
})

// ─── Public Survey (no auth) ───────────────────────────────────────────

describe("Public Survey", () => {
  beforeAll(async () => {
    const r = await api<{ survey: { status: string; slug: string } }>(`/surveys/${surveyId}/publish`, { method: "POST" })
    surveySlug = r.body.survey.slug
  })

  it("GET /public/surveys/:slug — returns published survey", async () => {
    const r = await withAuth(() =>
      api<{ survey: { title: string; orgName: string } }>(`/public/surveys/${surveySlug}`))
    expect(r.status).toBe(200)
    expect(r.body.survey.title).toBeTruthy()
    expect(r.body.survey.orgName).toBeTruthy()
  })

  it("GET /public/surveys/:slug — 404 on bad slug", async () => {
    const r = await withAuth(() => api("/public/surveys/nonexistent-slug-12345"))
    expect(r.status).toBe(404)
  })

  it("GET /public/surveys/:slug/upload-signature — returns Cloudinary config", async () => {
    const r = await withAuth(() =>
      api<{ cloudName: string; uploadPreset: string; folder: string }>(`/public/surveys/${surveySlug}/upload-signature`))
    expect(r.status).toBe(200)
    expect(r.body.cloudName).toBeTruthy()
    expect(r.body.uploadPreset).toBe("truetone-voice")
    expect(r.body.folder).toBe("truetone-audio")
  })

  it("POST /public/surveys/:slug/responses — creates response", async () => {
    const r = await withAuth(() =>
      api<{ response: { id: string } }>(`/public/surveys/${surveySlug}/responses`, {
        method: "POST",
        body: JSON.stringify({
          audioUrl: "https://example.com/audio.webm",
          durationSec: 42,
          sizeBytes: 128000,
          textFeedback: "Great product!",
        }),
      }))
    expect(r.status).toBe(201)
    expect(r.body.response.id).toBeTruthy()
    responseId = r.body.response.id
  })

  it("POST /public/surveys/:slug/responses — rejects without audioUrl", async () => {
    const r = await withAuth(() =>
      api(`/public/surveys/${surveySlug}/responses`, {
        method: "POST",
        body: JSON.stringify({}),
      }))
    expect(r.status).toBe(400)
  })
})

// ─── Responses & Pagination (authenticated) ────────────────────────────

describe("Responses & Pagination", () => {
  it("GET /surveys/:surveyId/responses — returns paginated list", async () => {
    type ResponseItem = { id: string; textFeedback: string | null; durationSec: number | null }
    const r = await api<{
      responses: ResponseItem[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/surveys/${surveyId}/responses?page=1&limit=10`)
    expect(r.status).toBe(200)
    expect(r.body.pagination.page).toBe(1)
    expect(r.body.pagination.limit).toBe(10)
    expect(r.body.pagination.total).toBeGreaterThanOrEqual(1)
    expect(r.body.responses.length).toBeGreaterThanOrEqual(1)
    const resp = r.body.responses.find((rr) => rr.id === responseId)
    expect(resp).toBeTruthy()
    expect(resp!.textFeedback).toBe("Great product!")
    expect(resp!.durationSec).toBe(42)
  })

  it("GET /surveys/:surveyId/responses — empty page returns empty array", async () => {
    const r = await api<{
      responses: unknown[]
      pagination: { page: number; totalPages: number }
    }>(`/surveys/${surveyId}/responses?page=999&limit=10`)
    expect(r.status).toBe(200)
    expect(r.body.responses).toEqual([])
    expect(r.body.pagination.page).toBe(999)
    expect(r.body.pagination.totalPages).toBeLessThan(999)
  })

  it("DELETE /surveys/:surveyId/responses/:id — deletes response", async () => {
    const r = await api<{ success: boolean }>(`/surveys/${surveyId}/responses/${responseId}`, {
      method: "DELETE",
    })
    expect(r.status).toBe(200)
    expect(r.body.success).toBe(true)
  })
})

// ─── Dashboard Overview (authenticated) ────────────────────────────────

describe("Dashboard Overview", () => {
  it("GET /dashboard/overview — returns stats", async () => {
    type OverviewStats = {
      stats: {
        totalResponses: number
        totalSurveys: number
        publishedSurveys: number
        draftSurveys: number
        processedCount: number
        failedCount: number
        processingRate: number
      }
      recentResponses: Array<{
        id: string
        surveyTitle: string
        sentiment: string | null
        createdAt: string
        status: string
      }>
    }
    const r = await api<OverviewStats>("/dashboard/overview")
    expect(r.status).toBe(200)
    expect(r.body.stats.totalSurveys).toBeGreaterThanOrEqual(1)
    expect(r.body.stats.publishedSurveys).toBeGreaterThanOrEqual(1)
    expect(typeof r.body.stats.processingRate).toBe("number")
    expect(Array.isArray(r.body.recentResponses)).toBe(true)
  })
})

// ─── Quick Review Flow (simulates the one-click dashboard CTA) ─────────

describe("Quick Review", () => {
  let quickId = ""
  let quickSlug = ""

  it("POST /surveys — creates a minimal 10s voice-only survey", async () => {
    const r = await api<{ survey: { id: string; slug: string; title: string; voiceDurationLimitSec: number; textFeedbackEnabled: boolean; status: string } }>("/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: "Quick Review",
        voiceDurationLimitSec: 10,
        textFeedbackEnabled: false,
      }),
    })
    expect(r.status).toBe(201)
    expect(r.body.survey.title).toBe("Quick Review")
    expect(r.body.survey.voiceDurationLimitSec).toBe(10)
    expect(r.body.survey.textFeedbackEnabled).toBe(false)
    expect(r.body.survey.status).toBe("DRAFT")
    quickId = r.body.survey.id
    quickSlug = r.body.survey.slug
  })

  it("POST /surveys/:id/publish — publishes the quick review", async () => {
    const r = await api<{ survey: { status: string; slug: string } }>(`/surveys/${quickId}/publish`, { method: "POST" })
    expect(r.status).toBe(200)
    expect(r.body.survey.status).toBe("PUBLISHED")
  })

  it("GET /public/surveys/:slug — returns correct 10s limit", async () => {
    const r = await withAuth(() =>
      api<{ survey: { voiceDurationLimitSec: number; title: string } }>(`/public/surveys/${quickSlug}`))
    expect(r.status).toBe(200)
    expect(r.body.survey.voiceDurationLimitSec).toBe(10)
    expect(r.body.survey.title).toBe("Quick Review")
  })

  it("POST /public/surveys/:slug/responses — accepts 5s voice response", async () => {
    const r = await withAuth(() =>
      api<{ response: { id: string } }>(`/public/surveys/${quickSlug}/responses`, {
        method: "POST",
        body: JSON.stringify({
          audioUrl: "https://example.com/quick.webm",
          durationSec: 5,
        }),
      }))
    expect(r.status).toBe(201)
    expect(r.body.response.id).toBeTruthy()
  })

  it("POST /surveys/:id/unpublish — cleans up quick review", async () => {
    const r = await api<{ survey: { status: string } }>(`/surveys/${quickId}/unpublish`, { method: "POST" })
    expect(r.status).toBe(200)
    expect(r.body.survey.status).toBe("DRAFT")
  })

  it("GET /dashboard/overview — quick review survey is counted in stats", async () => {
    type QuickStats = { stats: { totalSurveys: number; publishedSurveys: number } }
    const r = await api<QuickStats>("/dashboard/overview")
    expect(r.status).toBe(200)
    expect(r.body.stats.totalSurveys).toBeGreaterThanOrEqual(2)
    expect(r.body.stats.publishedSurveys).toBeGreaterThanOrEqual(1)
  })
})

// ─── Auth Guard ─────────────────────────────────────────────────────────

describe("Auth Guard", () => {
  it("GET /surveys — rejects without token", async () => {
    const saved = token; token = ""
    const r = await api("/surveys")
    token = saved
    expect(r.status).toBe(401)
  })

  it("GET /surveys — rejects bad token", async () => {
    const saved = token; token = "bad-token"
    const r = await api("/surveys")
    token = saved
    expect(r.status).toBe(401)
  })

  it("GET /dashboard/overview — rejects without token", async () => {
    const saved = token; token = ""
    const r = await api("/dashboard/overview")
    token = saved
    expect(r.status).toBe(401)
  })
})
