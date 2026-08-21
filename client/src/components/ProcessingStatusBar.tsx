import { useResponseStatus, type ProcessingStatus } from "@/hooks/useResponseStatus"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const STEPS: { key: ProcessingStatus; label: string }[] = [
  { key: "processing", label: "Preparing" },
  { key: "transcribing", label: "Transcribing audio" },
  { key: "analyzing", label: "Analysing with AI" },
  { key: "done", label: "Done" },
]

export default function ProcessingStatusBar({ responseId }: { responseId: string }) {
  const { status } = useResponseStatus(responseId)
  const currentIndex = STEPS.findIndex((s) => s.key === status)

  if (status === "done") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
        <CheckCircle2 className="h-4 w-4" />
        Analysis ready
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Processing failed
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step.key} className="flex items-center gap-2 text-sm">
            <span className={isComplete ? "text-emerald-500" : isCurrent ? "text-primary" : "text-muted-foreground/40"}>
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : isCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
              )}
            </span>
            <span className={isCurrent ? "font-medium text-foreground" : isComplete ? "text-foreground" : "text-muted-foreground"}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
