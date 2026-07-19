import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { api, type Survey } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import CreateSurvey from "./CreateSurvey"
import ShareSurveyModal from "@/components/ShareSurveyModal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import {
  Plus,
  Copy,
  BarChart3,
  Mic,
  Clock,
  CalendarDays,
  Eye,
  Loader2,
  Globe,
  GlobeOff,
  Share2,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react"

const statusColor: Record<string, "success" | "secondary" | "outline"> = {
  PUBLISHED: "success",
  DRAFT: "secondary",
  ARCHIVED: "outline",
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Surveys() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [shareSlug, setShareSlug] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await api.surveys.list()
      setSurveys(res.surveys)
    } catch {
      toast.error("Failed to load surveys")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSurveys() }, [fetchSurveys])

  async function toggleStatus(survey: Survey) {
    setToggling(survey.id)
    try {
      if (survey.status === "PUBLISHED") {
        await api.surveys.unpublish(survey.id)
        toast.success("Survey unpublished")
      } else {
        await api.surveys.publish(survey.id)
        toast.success("Survey published")
      }
      await fetchSurveys()
    } catch {
      toast.error("Failed to update survey")
    } finally {
      setToggling(null)
    }
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/survey/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  function confirmDelete(id: string) {
    setDeleteConfirm(id)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await api.surveys.delete(id)
      toast.success("Survey deleted")
      await fetchSurveys()
    } catch {
      toast.error("Failed to delete survey")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-8 min-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Surveys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your voice feedback surveys.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Survey
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-8 w-48 mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">No surveys yet</CardTitle>
            <CardDescription className="mt-1 max-w-sm">
              Create your first voice feedback survey to start collecting responses.
            </CardDescription>
            <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create your first survey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{survey.title}</CardTitle>
                      <Badge variant={statusColor[survey.status] ?? "secondary"}>
                        {survey.status === "PUBLISHED" ? (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Published
                          </span>
                        ) : survey.status === "DRAFT" ? (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Draft
                          </span>
                        ) : (
                          survey.status
                        )}
                      </Badge>
                    </div>
                    {survey.subtitle && (
                      <CardDescription>{survey.subtitle}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" />
                    {survey._count.responses.toLocaleString()} responses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {survey.voiceDurationLimitSec}s max
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Updated {formatTime(survey.updatedAt)}
                  </span>
                </div>
                <Separator className="my-3" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate(`/dashboard/surveys/${survey.id}/responses`)}>
                    <Eye className="h-3.5 w-3.5" />
                    Responses
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate(`/dashboard/analytics?surveyId=${survey.id}`)}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analytics
                  </Button>
                  {survey.status === "PUBLISHED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setShareSlug(survey.slug)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => copyLink(survey.slug)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => navigate(`/dashboard/surveys/${survey.id}/responses`)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                    disabled={deleting === survey.id}
                    onClick={() => confirmDelete(survey.id)}
                  >
                    {deleting === survey.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                  <Button
                    variant={survey.status === "PUBLISHED" ? "secondary" : "default"}
                    size="sm"
                    className="gap-1.5 text-xs ml-auto"
                    disabled={toggling === survey.id}
                    onClick={() => toggleStatus(survey)}
                  >
                    {toggling === survey.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : survey.status === "PUBLISHED" ? (
                      <GlobeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Globe className="h-3.5 w-3.5" />
                    )}
                    {survey.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSurvey
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={fetchSurveys}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        title="Delete survey"
        description="Are you sure you want to delete this survey? All responses and analysis will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />

      {shareSlug && (
        <ShareSurveyModal
          open={!!shareSlug}
          onOpenChange={(v) => !v && setShareSlug(null)}
          surveySlug={shareSlug}
          surveyTitle={surveys.find((s) => s.slug === shareSlug)?.title ?? ""}
        />
      )}
    </div>
  )
}
