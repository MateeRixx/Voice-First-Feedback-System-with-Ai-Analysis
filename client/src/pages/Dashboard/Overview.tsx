import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  ListFilter,
  ExternalLink,
} from "lucide-react"

const stats = [
  {
    label: "Total Responses",
    value: "847",
    change: "+12.5%",
    icon: Mic,
    trend: "up",
    detail: "Last 30 days: 142 responses collected",
  },
  {
    label: "Active Surveys",
    value: "4",
    change: "",
    icon: MessageSquareText,
    trend: "neutral",
    detail: "3 published, 1 draft — 2 due for review",
  },
  {
    label: "AI Insights Generated",
    value: "632",
    change: "+8.3%",
    icon: Brain,
    trend: "up",
    detail: "98.5% processing success rate",
  },
  {
    label: "Avg. Sentiment Score",
    value: "7.4",
    change: "+0.6",
    icon: TrendingUp,
    trend: "up",
    detail: "Positive trend across all surveys this month",
  },
]

const recentResponses = [
  {
    id: "1",
    survey: "Product Feedback Q3",
    sentiment: "positive",
    urgency: "low",
    duration: "42s",
    time: "2 min ago",
    snippet: "Really love the new interface, much easier to navigate...",
  },
  {
    id: "2",
    survey: "Customer Support Survey",
    sentiment: "negative",
    urgency: "high",
    duration: "1:23",
    time: "15 min ago",
    snippet: "Been waiting for a response for three days now, very frustrating...",
  },
  {
    id: "3",
    survey: "Employee Engagement",
    sentiment: "mixed",
    urgency: "medium",
    duration: "58s",
    time: "1 hr ago",
    snippet: "The team collaboration is great but we need better tools for remote work...",
  },
  {
    id: "4",
    survey: "Product Feedback Q3",
    sentiment: "positive",
    urgency: "low",
    duration: "36s",
    time: "3 hr ago",
    snippet: "The new dark mode is a game changer, been using it all week...",
  },
]

const sentimentIcon = {
  positive: Smile,
  negative: Frown,
  mixed: Meh,
}

const sentimentColor = {
  positive: "text-emerald-500",
  negative: "text-red-500",
  mixed: "text-amber-500",
}

const urgencyBadge = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
}

export default function Overview() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening across your surveys today.
          </p>
        </div>
        <Button className="gap-2">
          <ListFilter className="h-4 w-4" />
          Last 7 days
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                  {stat.change && (
                    <span
                      className={`flex items-center text-xs font-medium ${
                        stat.trend === "up" ? "text-emerald-500" : "text-muted-foreground"
                      }`}
                    >
                      <ArrowUpRight className="mr-0.5 h-3 w-3" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {stat.detail}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Responses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Responses</CardTitle>
            <CardDescription>Latest voice feedback across all surveys</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {}}>
            <ExternalLink className="h-3.5 w-3.5" />
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentResponses.map((r) => {
              const SentimentIcon = sentimentIcon[r.sentiment as keyof typeof sentimentIcon]
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className={`mt-0.5 ${sentimentColor[r.sentiment as keyof typeof sentimentColor]}`}>
                    <SentimentIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.survey}</span>
                      <Badge variant={urgencyBadge[r.urgency as keyof typeof urgencyBadge]}>
                        {r.urgency}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{r.snippet}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.time}
                      </span>
                      <span>{r.duration}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
