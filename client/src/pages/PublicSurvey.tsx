import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import AnimatedHero from "@/components/AnimatedHero"
import {
  Mic,
  Shield,
  Clock,
  MessageSquareText,
  CheckCircle2,
} from "lucide-react"

export default function PublicSurvey() {
  const { slug } = useParams<{ slug: string }>()
  const [survey, setSurvey] = useState<Awaited<ReturnType<typeof api.public.getSurvey>>["survey"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitted] = useState(false)

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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-gray-950 dark:via-violet-950/30 dark:to-fuchsia-950/30 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="mx-auto h-4 w-80" />
          <Skeleton className="mx-auto h-12 w-48 rounded-full" />
        </div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-gray-950 dark:via-violet-950/30 dark:to-fuchsia-950/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Survey not available</h1>
          <p className="text-sm text-muted-foreground">
            {error || "This survey may have been unpublished or the link is incorrect."}
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-gray-950 dark:via-violet-950/30 dark:to-fuchsia-950/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-in fade-in-0 zoom-in-95">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Thank you</h1>
            <p className="text-muted-foreground">
              Your response has been recorded and will be reviewed shortly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-gray-950 dark:via-violet-950/30 dark:to-fuchsia-950/30">
      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 animate-gradient pointer-events-none opacity-30 dark:opacity-20"
        style={{
          background: "linear-gradient(-45deg, rgba(139,92,246,0.15), rgba(232,121,249,0.1), rgba(6,182,212,0.1), rgba(251,146,60,0.08))",
          backgroundSize: "400% 400%",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-white/50 dark:bg-gray-900/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <Shield className="h-3 w-3" />
            <span>Powered by {survey.orgName}</span>
          </div>
        </div>

        {/* Hero illustration */}
        <div className="mb-8">
          <AnimatedHero />
        </div>

        {/* Survey details */}
        <div className="w-full space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {survey.title}
            </h1>
            {survey.subtitle && (
              <p className="text-muted-foreground leading-relaxed">
                {survey.subtitle}
              </p>
            )}
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-white/50 dark:bg-gray-900/50 px-3 py-1.5 backdrop-blur-sm">
              <Mic className="h-3.5 w-3.5" />
              Voice response
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-white/50 dark:bg-gray-900/50 px-3 py-1.5 backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5" />
              Up to {survey.voiceDurationLimitSec}s
            </span>
            {survey.textFeedbackEnabled && (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-white/50 dark:bg-gray-900/50 px-3 py-1.5 backdrop-blur-sm">
                <MessageSquareText className="h-3.5 w-3.5" />
                Text also accepted
              </span>
            )}
          </div>

          {/* Safety reassurance */}
          <div className="rounded-xl border bg-white/60 dark:bg-gray-900/60 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your response is anonymous. No personal information is collected.
              You can speak freely — your feedback helps {survey.orgName} improve.
            </p>
          </div>

          {/* Record CTA */}
          <div className="pt-4">
            <Button
              size="lg"
              className="h-14 w-full gap-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-base font-medium text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-300 active:scale-[0.98]"
            >
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Tap to begin. You'll have {survey.voiceDurationLimitSec} seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
