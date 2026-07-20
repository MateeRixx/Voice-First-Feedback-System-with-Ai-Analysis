import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api, type Survey } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import {
  ArrowLeft,
  Mic,
  Clock,
  FileText,
  Brain,
  Loader2,
  Trash2,
} from "lucide-react"

type ResponseItem = {
  id: string
  durationSec: number | null
  textFeedback: string | null
  status: "PENDING" | "PROCESSED" | "FAILED"
  createdAt: string
  attachment: { r2Url: string; mimeType: string; sizeBytes: number } | null
  transcript: { text: string; language: string | null } | null
  insight: { summary: string; sentiment: string; urgency: string; tags: string[] } | null
}

const statusColor: Record<string, "secondary" | "success" | "destructive"> = {
  PENDING: "secondary",
  PROCESSED: "success",
  FAILED: "destructive",
}

const sentimentColor: Record<string, string> = {
  POSITIVE: "text-emerald-500",
  NEGATIVE: "text-red-500",
  NEUTRAL: "text-muted-foreground",
  MIXED: "text-amber-500",
}

const urgencyColor: Record<string, "secondary" | "destructive" | "outline"> = {
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export default function Responses() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchData = (p = page) => {
    if (!surveyId) return
    setLoading(true)
    Promise.all([
      api.surveys.get(surveyId),
      api.surveys.listResponses(surveyId, { page: p, limit: 20 }),
    ])
      .then(([surveyRes, responsesRes]) => {
        setSurvey(surveyRes.survey)
        setResponses(responsesRes.responses)
        setPagination(responsesRes.pagination)
      })
      .catch(() => toast.error("Failed to load responses"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(page) }, [surveyId, page])

  async function handleProcess(responseId: string) {
    if (!surveyId) return
    setProcessingId(responseId)
    try {
      await api.surveys.processResponse(surveyId, responseId)
      toast.success("Response processed")
      fetchData()
    } catch {
      toast.error("Failed to process response")
    } finally {
      setProcessingId(null)
    }
  }

  function confirmDeleteResponse(id: string) {
    setDeleteConfirm(id)
  }

  async function handleDelete(responseId: string) {
    if (!surveyId) return
    try {
      await api.surveys.deleteResponse(surveyId, responseId)
      toast.success("Response deleted")
      fetchData()
    } catch {
      toast.error("Failed to delete response")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        title="Delete response"
        description="Are you sure you want to delete this response?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/surveys")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{survey?.title ?? "Responses"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {responses.length} response{responses.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">No responses yet</CardTitle>
            <CardDescription className="mt-1 max-w-sm">
              Share the survey link to start collecting voice feedback.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {responses.map((r) => (
            <Card key={r.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColor[r.status] ?? "secondary"} className="capitalize">
                      {r.status.toLowerCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{formatTime(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {r.durationSec != null ? fmtDuration(r.durationSec) : "N/A"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => confirmDeleteResponse(r.id)}
                      aria-label="Delete response"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.attachment && (
                  <audio src={r.attachment.r2Url} controls className="w-full h-10" />
                )}

                {r.textFeedback && (
                  <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{r.textFeedback}</p>
                  </div>
                )}

                {(r.status === "PENDING" || r.status === "FAILED") && (
                  <Button
                    variant={r.status === "FAILED" ? "destructive" : "secondary"}
                    size="sm"
                    className="gap-1.5"
                    disabled={processingId === r.id}
                    onClick={() => handleProcess(r.id)}
                  >
                    {processingId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Brain className="h-3.5 w-3.5" />
                    )}
                    {processingId === r.id ? "Processing..." : r.status === "FAILED" ? "Retry" : "Process with AI"}
                  </Button>
                )}

                {r.transcript && (
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Transcript</p>
                    <p className="text-sm">{r.transcript.text}</p>
                  </div>
                )}

                {r.insight && (
                  <div className="space-y-2 rounded-lg border bg-card px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">AI Summary</p>
                    <p className="text-sm">{r.insight.summary}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="outline" className={`gap-1 ${sentimentColor[r.insight.sentiment] ?? ""}`}>
                        {r.insight.sentiment.toLowerCase()}
                      </Badge>
                      <Badge variant={urgencyColor[r.insight.urgency] ?? "outline"}>
                        {r.insight.urgency.toLowerCase()} urgency
                      </Badge>
                      {r.insight.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!r.attachment && !r.textFeedback && r.status === "PENDING" && (
                  <p className="text-xs text-muted-foreground">No audio or text content</p>
                )}
              </CardContent>
            </Card>
          ))}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
