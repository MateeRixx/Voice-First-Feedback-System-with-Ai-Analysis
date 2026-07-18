import { useState, useEffect } from "react"
import { api, type Survey } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  TrendingUp,
  Lightbulb,
  Smile,
  Meh,
  Frown,
  Brain,
  Loader2,
  AlertCircle,
} from "lucide-react"

type Analysis = {
  totalResponses: number
  summary: string
  sentimentBreakdown: Record<string, number>
  topTags: string[]
  commonThemes: string[]
  recommendations: string[]
}

const sentimentIcons: Record<string, typeof Smile> = {
  POSITIVE: Smile,
  NEUTRAL: Meh,
  NEGATIVE: Frown,
  MIXED: Meh,
}

const sentimentColors: Record<string, string> = {
  POSITIVE: "bg-emerald-500",
  NEUTRAL: "bg-amber-500",
  NEGATIVE: "bg-red-500",
  MIXED: "bg-purple-500",
}

export default function Analytics() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api.surveys.list()
      .then((r) => {
        setSurveys(r.surveys)
        if (r.surveys.length > 0) setSelectedId(r.surveys[0].id)
      })
      .catch(() => toast.error("Failed to load surveys"))
  }, [])

  async function handleAnalyze() {
    if (!selectedId) return
    setAnalyzing(true)
    setError("")
    setAnalysis(null)
    try {
      const res = await api.surveys.getSurveyAnalysis(selectedId)
      setAnalysis(res.analysis)
      toast.success("Analysis complete")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed"
      setError(msg)
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const totalSentiment = analysis?.sentimentBreakdown
    ? Object.values(analysis.sentimentBreakdown).reduce((a, b) => a + (b ?? 0), 0) || 1
    : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Survey Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered insights for each survey.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setAnalysis(null); setError("") }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={analyzing || !selectedId}
          onClick={handleAnalyze}
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {analyzing ? "Generating Report..." : "Run AI Analysis"}
        </Button>
      </div>

      {analyzing && (
        <Card className="py-16">
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

      {error && !analyzing && (
        <Card className="py-12 border-destructive/50">
          <CardContent className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardDescription className="text-destructive max-w-md">{error}</CardDescription>
            <Button variant="outline" size="sm" onClick={handleAnalyze}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!analyzing && !error && !analysis && (
        <Card className="py-12">
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sentiment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {Object.entries(analysis.sentimentBreakdown || {}).map(([key, value]) => {
                      const Icon = sentimentIcons[key] ?? Meh
                      const pct = Math.round((value / totalSentiment) * 100)
                      return (
                        <div key={key} className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium capitalize">{key.toLowerCase()}</span>
                            <span className="text-sm font-bold ml-auto">{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${sentimentColors[key] ?? "bg-primary"} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
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
                      <ul className="space-y-2">
                        {analysis.commonThemes.map((theme, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {theme}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analysis.recommendations ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recommendations yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

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
