const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("truetone-token")
  const hasBody = options?.body !== undefined && options.body !== null
  const headers: Record<string, string> = {}
  if (hasBody) headers["Content-Type"] = "application/json"
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (options?.headers) {
    const extraHeaders = options.headers as Record<string, string>
    for (const key in extraHeaders) {
      headers[key] = extraHeaders[key]
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  return res.json()
}

export interface AuthResponse {
  token: string
  user: { id: string; email: string; role: string; orgId: string }
}

export type MediaItem = {
  type: "image" | "video"
  url: string
  caption?: string
}

export interface Survey {
  id: string
  orgId: string
  title: string
  subtitle: string | null
  description: string | null
  slug: string
  voiceDurationLimitSec: number
  textFeedbackEnabled: boolean
  theme: Record<string, unknown> | null
  media: MediaItem[] | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  createdAt: string
  updatedAt: string
  _count: { responses: number }
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, orgName: string, securityQuestion: string, securityAnswer: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, orgName, securityQuestion, securityAnswer }),
    }),
  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),
  getSecurityQuestion: (email: string) =>
    request<{ question: string }>("/auth/security-question", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (email: string, securityAnswer: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, securityAnswer, newPassword }),
    }),

  public: {
    getSurvey: (slug: string) =>
      request<{
        survey: {
          id: string
          title: string
          subtitle: string | null
          description: string | null
          orgName: string
          voiceDurationLimitSec: number
          textFeedbackEnabled: boolean
          theme: Record<string, unknown> | null
          media: MediaItem[] | null
          responseCount: number
        }
      }>(`/public/surveys/${slug}`),

    getUploadSignature: (slug: string) =>
      request<{
        cloudName: string
        uploadPreset: string
        folder: string
      }>(`/public/surveys/${slug}/upload-signature`),

    submitResponse: (slug: string, data: { audioUrl?: string; durationSec?: number; sizeBytes?: number; textFeedback?: string }) =>
      request<{ response: { id: string } }>(`/public/surveys/${slug}/responses`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  surveys: {
    list: () => request<{ surveys: Survey[] }>("/surveys"),
    get: (id: string) => request<{ survey: Survey }>(`/surveys/${id}`),
    create: (data: { title: string; subtitle?: string; description?: string; voiceDurationLimitSec?: number; textFeedbackEnabled?: boolean; theme?: Record<string, unknown>; media?: MediaItem[] }) =>
      request<{ survey: Survey }>("/surveys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ title: string; subtitle: string; description: string; voiceDurationLimitSec: number; textFeedbackEnabled: boolean; theme: Record<string, unknown>; media: MediaItem[] }>) =>
      request<{ survey: Survey }>(`/surveys/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    publish: (id: string) =>
      request<{ survey: Survey }>(`/surveys/${id}/publish`, { method: "POST" }),
    unpublish: (id: string) =>
      request<{ survey: Survey }>(`/surveys/${id}/unpublish`, { method: "POST" }),
    listResponses: (surveyId: string, params?: { page?: number; limit?: number }) =>
      request<{
        responses: Array<{
          id: string
          durationSec: number | null
          textFeedback: string | null
          status: "PENDING" | "PROCESSED" | "FAILED"
          createdAt: string
          attachment: {
            r2Url: string
            mimeType: string
            sizeBytes: number
          } | null
          transcript: {
            text: string
            language: string | null
          } | null
          insight: {
            summary: string
            sentiment: string
            urgency: string
            tags: string[]
          } | null
        }>
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }>(`/surveys/${surveyId}/responses${params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : ""}`),
    processResponse: (surveyId: string, responseId: string) =>
      request<{ success: boolean }>(`/surveys/${surveyId}/responses/${responseId}/process`, {
        method: "POST",
      }),
    getSurveyAnalysis: (surveyId: string, force?: boolean) =>
      request<{
        analysis: {
          totalResponses: number
          summary: string
          sentimentBreakdown: Record<string, number>
          topTags: string[]
          commonThemes: Array<{ theme: string; frequency: string; sentiment: string }>
          recommendations: Array<{ priority: string; action: string; impact: string }>
        }
      }>(`/surveys/${surveyId}/analysis${force ? "?_force=1" : ""}`),
    deleteResponse: (surveyId: string, responseId: string) =>
      request<{ success: boolean }>(`/surveys/${surveyId}/responses/${responseId}`, {
        method: "DELETE",
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/surveys/${id}`, { method: "DELETE" }),
    exportCSV: async (surveyId: string): Promise<Blob> => {
      const token = localStorage.getItem("truetone-token")
      const res = await fetch(`${API_BASE}/surveys/${surveyId}/export/csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Export failed: ${res.status}`)
      }
      return res.blob()
    },
  },

  dashboard: {
    overview: () =>
      request<{
        stats: {
          totalResponses: number
          totalSurveys: number
          publishedSurveys: number
          draftSurveys: number
          processedCount: number
          failedCount: number
          processingRate: number
          totalProcessed: number
        }
        recentResponses: Array<{
          id: string
          surveyTitle: string
          sentiment: string | null
          urgency: string | null
          durationSec: number | null
          createdAt: string
          summary: string | null
          status: string
        }>
      }>("/dashboard/overview"),
  },
}
