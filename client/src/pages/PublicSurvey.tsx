import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import VoiceRecorder from "@/components/VoiceRecorder"
import AnimatedHero from "@/components/AnimatedHero"
import {
  Mic,
  Clock,
  MessageSquareText,
  CheckCircle2,
  ShieldX,
  Volume2,
  Lock,
} from "lucide-react"

export default function PublicSurvey() {
  const { slug } = useParams<{ slug: string }>()
  const [survey, setSurvey] = useState<Awaited<ReturnType<typeof api.public.getSurvey>>["survey"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    api.public
      .getSurvey(slug)
      .then((res) => setSurvey(res.survey))
      .catch(() => setError("This survey could not be found or is no longer available."))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <Skeleton className="mx-auto h-36 w-36 rounded-full" />
          <Skeleton className="mx-auto h-7 w-56" />
          <Skeleton className="mx-auto h-4 w-72" />
          <Skeleton className="mx-auto h-10 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Survey not available</CardTitle>
              <CardDescription>
                {error || "This survey may have been unpublished or the link is incorrect."}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Thank you</CardTitle>
              <CardDescription>
                Your response has been recorded and will be reviewed shortly.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground mx-auto">
            <Volume2 className="h-3 w-3" />
            <span>{survey.orgName}</span>
          </div>

          <AnimatedHero />

          <div className="space-y-1.5">
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.subtitle && (
              <CardDescription className="text-sm leading-relaxed max-w-sm mx-auto">
                {survey.subtitle}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <Mic className="h-3 w-3" />
              Voice response
            </Badge>
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <Clock className="h-3 w-3" />
              Up to {survey.voiceDurationLimitSec}s
            </Badge>
            {survey.textFeedbackEnabled && (
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <MessageSquareText className="h-3 w-3" />
                Text also accepted
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-muted px-4 py-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your response is anonymous. No personal information is collected.
              Speak freely &mdash; your feedback helps <strong>{survey.orgName}</strong> improve.
            </p>
          </div>

          <VoiceRecorder
            slug={slug!}
            voiceDurationLimitSec={survey.voiceDurationLimitSec}
            textFeedbackEnabled={survey.textFeedbackEnabled}
            onComplete={() => setSubmitted(true)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
