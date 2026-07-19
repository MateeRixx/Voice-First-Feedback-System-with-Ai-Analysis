import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { api, type Survey } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  Lightbulb,
  Smile,
  Meh,
  Frown,
  Brain,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react"

type Analysis = {
  totalResponses: number
  summary: string
  sentimentBreakdown: Record<string, number>
  topTags: string[]
  commonThemes: Array<{ theme: string; frequency: string; sentiment: string }>
  recommendations: Array<{ priority: string; action: string; impact: string }>
}

const sentimentIcons: Record<string, typeof Smile> = {
  POSITIVE: Smile,
  NEUTRAL: Meh,
  NEGATIVE: Frown,
  MIXED: Meh,
}

const CHART_COLORS: Record<string, string> = {
  POSITIVE: "#10b981",
  NEUTRAL: "#f59e0b",
  NEGATIVE: "#ef4444",
  MIXED: "#8b5cf6",
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#6b7280",
}

const priorityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-muted text-muted-foreground",
}

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedId, setSelectedId] = useState(searchParams.get("surveyId") || "")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api.surveys.list()
      .then((r) => {
        setSurveys(r.surveys)
        const urlId = searchParams.get("surveyId")
        if (urlId && r.surveys.some((s) => s.id === urlId)) {
          setSelectedId(urlId)
        } else if (!selectedId && r.surveys.length > 0) {
          setSelectedId(r.surveys[0].id)
        }
      })
      .catch(() => toast.error("Failed to load surveys"))
  }, [])

  const autoLoaded = useRef(false)

  useEffect(() => {
    autoLoaded.current = false
    setError("")
  }, [selectedId])

  useEffect(() => {
    if (!selectedId || autoLoaded.current) return
    autoLoaded.current = true
    setLoadingAnalysis(true)
    api.surveys.getSurveyAnalysis(selectedId)
      .then((res) => setAnalysis(res.analysis))
      .catch(() => {})
      .finally(() => setLoadingAnalysis(false))
  }, [selectedId])

  useEffect(() => {
    if (selectedId) {
      setSearchParams(selectedId ? { surveyId: selectedId } : {}, { replace: true })
    }
  }, [selectedId, setSearchParams])

  async function handleAnalyze(force = false) {
    if (!selectedId) return
    setAnalyzing(true)
    setError("")
    if (!force) setAnalysis(null)
    try {
      const res = await api.surveys.getSurveyAnalysis(selectedId, force)
      setAnalysis(res.analysis)
      toast.success(force ? "Report refreshed" : "Analysis complete")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed"
      setError(msg)
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const sentimentData = analysis?.sentimentBreakdown
    ? Object.entries(analysis.sentimentBreakdown).map(([name, value]) => ({ name: name.charAt(0) + name.slice(1).toLowerCase(), value }))
    : []

  const urgencyCounts: Record<string, number> = {}
  if (analysis?.recommendations) {
    for (const rec of analysis.recommendations) {
      urgencyCounts[rec.priority] = (urgencyCounts[rec.priority] || 0) + 1
    }
  }
  const urgencyData = Object.entries(urgencyCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

  const totalSentiment = analysis?.sentimentBreakdown
    ? Object.values(analysis.sentimentBreakdown).reduce((a, b) => a + (b ?? 0), 0) || 1
    : 1

  return (
    <div className="space-y-6 min-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered sentiment analysis and insights for your surveys.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedId}
          onValueChange={setSelectedId}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a survey" />
          </SelectTrigger>
          <SelectContent>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={analysis ? "outline" : "secondary"}
          size="sm"
          className="gap-1.5 w-[145px] shrink-0"
          disabled={analyzing || loadingAnalysis || !selectedId}
          onClick={() => handleAnalyze(analysis ? true : false)}
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          ) : (
            <Brain className="h-4 w-4 shrink-0" />
          )}
          <span>{analyzing ? "Generating..." : analysis ? "Re-analyze" : "Run AI Analysis"}</span>
        </Button>
      </div>

      {analyzing && (
        <Card className="py-16 min-h-[300px]">
          <CardContent className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">Generating Report</CardTitle>
              <CardDescription>
                Analyzing {surveys.find((s) => s.id === selectedId)?.title ?? "survey"} responses...
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingAnalysis && !analyzing && !analysis && (
        <Card className="py-16 min-h-[300px]">
          <CardContent className="flex flex-col items-center text-center gap-4">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <CardDescription>Loading existing analysis...</CardDescription>
          </CardContent>
        </Card>
      )}

      {error && !analyzing && (
        <Card className="py-12 border-destructive/50 min-h-[300px]">
          <CardContent className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardDescription className="text-destructive max-w-md">{error}</CardDescription>
            <Button variant="outline" size="sm" onClick={() => handleAnalyze(true)}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!analyzing && !error && !analysis && !loadingAnalysis && (
        <Card className="py-12 min-h-[300px]">
          <CardContent className="flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">No analysis yet</CardTitle>
            <CardDescription className="mt-1 max-w-sm">
              Process some responses first, then run AI analysis on this survey.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {!analyzing && analysis && (
        <>
          {analysis.totalResponses === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center text-center">
                <CardDescription>No processed responses to analyze.</CardDescription>
              </CardContent>
            </Card>
          ) : (
            <>
              {loadingAnalysis && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing...
                </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Executive Summary
                  </CardTitle>
                  <CardDescription>
                    Based on {analysis.totalResponses} processed response{analysis.totalResponses !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {analysis.summary || "No summary available."}
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sentiment Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sentimentData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sentiment data</p>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="shrink-0">
                          <ResponsiveContainer width={140} height={140}>
                            <PieChart>
                              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" strokeWidth={0}>
                                {sentimentData.map((entry) => (
                                  <Cell key={entry.name} fill={CHART_COLORS[entry.name.toUpperCase()] ?? "#6b7280"} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 flex-1">
                          {sentimentData.map((item) => {
                            const key = item.name.toUpperCase()
                            const Icon = sentimentIcons[key] ?? Meh
                            const pct = Math.round((item.value / totalSentiment) * 100)
                            return (
                              <div key={item.name} className="flex items-center gap-2 text-sm">
                                <Icon className="h-4 w-4 shrink-0" style={{ color: CHART_COLORS[key] }} />
                                <span className="flex-1 capitalize">{item.name.toLowerCase()}</span>
                                <span className="font-medium">{pct}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Urgency Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {urgencyData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No urgency data</p>
                    ) : (
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={urgencyData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                              {urgencyData.map((entry) => (
                                <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name.toLowerCase()] ?? "#6b7280"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Common Themes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(analysis.commonThemes ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No themes identified.</p>
                  ) : (
                    <div className="space-y-3">
                      {analysis.commonThemes.map((item, i) => (
                        <div key={i} className="rounded-lg border bg-card px-3 py-2.5 space-y-1">
                          <p className="text-sm font-medium">{item.theme}</p>
                          {(item.frequency || item.sentiment) && (
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {item.frequency && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                                  {item.frequency}
                                </span>
                              )}
                              {item.sentiment && (
                                <span className="inline-flex items-center gap-1">
                                  {item.sentiment.toLowerCase().includes("positive") ? (
                                    <ArrowUp className="h-3 w-3 text-emerald-500" />
                                  ) : item.sentiment.toLowerCase().includes("negative") ? (
                                    <ArrowDown className="h-3 w-3 text-red-500" />
                                  ) : (
                                    <Minus className="h-3 w-3 text-amber-500" />
                                  )}
                                  {item.sentiment}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>Priority-ranked actions for your team</CardDescription>
                </CardHeader>
                <CardContent>
                  {(analysis.recommendations ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recommendations yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {analysis.recommendations.map((rec, i) => (
                        <div key={i} className={cn(
                          "rounded-lg border p-3 space-y-1.5",
                          rec.priority === "critical" ? "border-red-500/30 bg-red-500/5" :
                          rec.priority === "high" ? "border-orange-500/30 bg-orange-500/5" :
                          rec.priority === "medium" ? "border-amber-500/20" : ""
                        )}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider px-1.5 py-0", priorityColor[rec.priority] ?? "")}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm">{rec.action}</p>
                          {rec.impact && (
                            <p className="text-xs text-muted-foreground">{rec.impact}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {(analysis.topTags ?? []).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.topTags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
