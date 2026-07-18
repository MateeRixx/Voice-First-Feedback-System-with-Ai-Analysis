const API_BASE = "http://127.0.0.1:3000/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("truetone-token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
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

export interface Survey {
  id: string
  orgId: string
  title: string
  subtitle: string | null
  slug: string
  voiceDurationLimitSec: number
  textFeedbackEnabled: boolean
  theme: Record<string, unknown> | null
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
  register: (email: string, password: string, orgName: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, orgName }),
    }),
  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),

  surveys: {
    list: () => request<{ surveys: Survey[] }>("/surveys"),
    get: (id: string) => request<{ survey: Survey }>(`/surveys/${id}`),
    create: (data: { title: string; subtitle?: string; voiceDurationLimitSec?: number; textFeedbackEnabled?: boolean }) =>
      request<{ survey: Survey }>("/surveys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ title: string; subtitle: string; voiceDurationLimitSec: number; textFeedbackEnabled: boolean; theme: Record<string, unknown> }>) =>
      request<{ survey: Survey }>(`/surveys/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    publish: (id: string) =>
      request<{ survey: Survey }>(`/surveys/${id}/publish`, { method: "POST" }),
    unpublish: (id: string) =>
      request<{ survey: Survey }>(`/surveys/${id}/unpublish`, { method: "POST" }),
  },
}
