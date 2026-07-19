import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import {
  Mic,
  MessageSquareText,
  Brain,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  ArrowUpRight,
  Clock,
} from "lucide-react"

const sentimentIcon: Record<string, typeof Smile> = {
  POSITIVE: Smile,
  NEGATIVE: Frown,
  MIXED: Meh,
}

const sentimentColor: Record<string, string> = {
  POSITIVE: "text-emerald-500",
  NEGATIVE: "text-red-500",
  MIXED: "text-amber-500",
}

const urgencyBadge: Record<string, "destructive" | "secondary" | "outline"> = {
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Overview() {
  const [stats, setStats] = useState<{
    totalResponses: number
    totalSurveys: number
    publishedSurveys: number
    draftSurveys: number
    processedCount: number
    failedCount: number
    processingRate: number
    totalProcessed: number
  } | null>(null)
  const [recentResponses, setRecentResponses] = useState<Array<{
    id: string
    surveyTitle: string
    sentiment: string | null
    urgency: string | null
    durationSec: number | null
    createdAt: string
    summary: string | null
    status: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard.overview()
      .then((res) => {
        setStats(res.stats)
        setRecentResponses(res.recentResponses)
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 min-h-[calc(100vh-12rem)]">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const statCards = stats ? [
    {
      label: "Total Responses",
      value: stats.totalResponses.toLocaleString(),
      change: `${stats.processingRate}% processed`,
      icon: Mic,
      detail: `${stats.processedCount} processed, ${stats.failedCount} failed`,
    },
    {
      label: "Active Surveys",
      value: String(stats.totalSurveys),
      change: `${stats.publishedSurveys} published`,
      icon: MessageSquareText,
      detail: `${stats.draftSurveys} in draft`,
    },
    {
      label: "AI Insights Generated",
      value: stats.processedCount.toLocaleString(),
      change: `${stats.totalProcessed > 0 ? "active" : "pending"}`,
      icon: Brain,
      detail: `${stats.processingRate}% processing success rate`,
    },
    {
      label: "Responses to Review",
      value: (stats.totalResponses - stats.processedCount).toLocaleString(),
      change: stats.failedCount > 0 ? `${stats.failedCount} failed` : "all good",
      icon: TrendingUp,
      detail: stats.failedCount > 0 ? "Retry failed responses in the responses view" : "No pending items",
    },
  ] : []

  return (
    <div className="space-y-8 min-h-[calc(100vh-12rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's happening across your surveys today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="group relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground/60" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stat.value}</span>
                  <span className="flex items-center text-xs font-medium text-muted-foreground">
                    <ArrowUpRight className="mr-0.5 h-3 w-3" />
                    {stat.change}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {stat.detail}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Responses</CardTitle>
          <CardDescription>Latest voice feedback across all surveys</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentResponses.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No responses yet. Create a survey and share the link to start collecting feedback.
            </div>
          ) : (
            <div className="divide-y">
              {recentResponses.map((r) => {
                const SentimentIcon = r.sentiment ? sentimentIcon[r.sentiment] : null
                const sentColor = r.sentiment ? sentimentColor[r.sentiment] : ""
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {SentimentIcon && (
                      <div className={`mt-0.5 ${sentColor}`}>
                        <SentimentIcon className="h-5 w-5" />
                      </div>
                    )}
                    {!SentimentIcon && (
                      <div className="mt-0.5 text-muted-foreground">
                        <Clock className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.surveyTitle}</span>
                        {r.urgency && (
                          <Badge variant={urgencyBadge[r.urgency] ?? "outline"}>
                            {r.urgency.toLowerCase()}
                          </Badge>
                        )}
                        <Badge variant={r.status === "FAILED" ? "destructive" : "secondary"} className="ml-auto">
                          {r.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {r.summary || "No summary yet"}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(r.createdAt)}
                        </span>
                        {r.durationSec && <span>{Math.floor(r.durationSec / 60)}:{String(r.durationSec % 60).padStart(2, "0")}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
