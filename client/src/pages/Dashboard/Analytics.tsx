import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  ArrowUpRight,
  Download,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"

const sentimentData = [
  { label: "Positive", value: 58, color: "bg-emerald-500", icon: Smile },
  { label: "Neutral", value: 27, color: "bg-amber-500", icon: Meh },
  { label: "Negative", value: 15, color: "bg-red-500", icon: Frown },
]

const insights = [
  {
    type: "theme",
    icon: Lightbulb,
    title: "UI/UX improvements requested",
    description: "22 respondents mentioned navigation difficulties in the dashboard",
    frequency: "22 mentions",
    trend: "+8%",
  },
  {
    type: "alert",
    icon: AlertTriangle,
    title: "Response time concerns",
    description: "15 respondents reported dissatisfaction with support response times",
    frequency: "15 mentions",
    trend: "+12%",
  },
  {
    type: "positive",
    icon: TrendingUp,
    title: "Feature adoption growing",
    description: "Positive feedback about the new analytics dashboard feature",
    frequency: "31 mentions",
    trend: "+25%",
  },
]

const recentActivity = [
  {
    survey: "Product Feedback Q3",
    sentiment: "positive" as const,
    text: "The new search feature is exactly what we needed, works great!",
    time: "5 min ago",
  },
  {
    survey: "Customer Support",
    sentiment: "negative" as const,
    text: "Response times have been getting worse over the past month...",
    time: "23 min ago",
  },
  {
    survey: "Employee Engagement",
    sentiment: "mixed" as const,
    text: "Remote work policy is good but we need better async communication tools",
    time: "1 hr ago",
  },
]

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered insights across all your surveys.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Sentiment Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Distribution</CardTitle>
          <CardDescription>Overall sentiment across all responses this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {sentimentData.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-sm font-bold ml-auto">{s.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all`}
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <Card key={insight.title} className="group cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${
                    insight.type === "theme"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : insight.type === "alert"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {insight.frequency}
                  </Badge>
                </div>
                <CardTitle className="text-sm mt-3">{insight.title}</CardTitle>
                <CardDescription className="text-xs">
                  {insight.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <ArrowUpRight className="h-3 w-3" />
                  {insight.trend} vs last period
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest responses with AI analysis</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className={`mt-0.5 ${
                  item.sentiment === "positive" ? "text-emerald-500"
                  : item.sentiment === "negative" ? "text-red-500"
                  : "text-amber-500"
                }`}>
                  {item.sentiment === "positive" ? <Smile className="h-5 w-5" />
                    : item.sentiment === "negative" ? <Frown className="h-5 w-5" />
                    : <Meh className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.survey}</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {item.sentiment}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{item.text}</p>
                  <span className="mt-1 text-xs text-muted-foreground">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
