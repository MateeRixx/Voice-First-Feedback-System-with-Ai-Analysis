import { useState, useRef, useCallback, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import RecordingIndicator from "@/components/RecordingIndicator"
import {
  Mic,
  Square,
  RotateCcw,
  Upload,
  CheckCircle2,
  Loader2,
  MessageSquareText,
} from "lucide-react"

interface VoiceRecorderProps {
  slug: string
  voiceDurationLimitSec: number
  textFeedbackEnabled: boolean
  onComplete: () => void
}

type RecorderState = "idle" | "requesting-mic" | "recording" | "stopped" | "uploading" | "done"

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ""
}

export default function VoiceRecorder({
  slug,
  voiceDurationLimitSec,
  textFeedbackEnabled,
  onComplete,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle")
  const [duration, setDuration] = useState(0)
  const [textFeedback, setTextFeedback] = useState("")

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const stopAll = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
    mediaRecorder.current = null
  }, [])

  useEffect(() => {
    return stopAll
  }, [stopAll])

  async function startRecording() {
    setState("requesting-mic")
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not available in this browser")
      }

      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = {}
      if (mimeType) options.mimeType = mimeType

      const recorder = new MediaRecorder(s, options)
      mediaRecorder.current = recorder
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = () => {
        if (stream.current) {
          stream.current.getTracks().forEach((t) => t.stop())
          stream.current = null
        }
        const totalBytes = chunks.current.reduce((sum, c) => sum + c.size, 0)
        if (totalBytes < 100) {
          toast.error("Recording too short. Please try again.")
          chunks.current = []
          setState("idle")
          return
        }
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState("stopped")
      }

      recorder.onerror = () => {
        toast.error("Recording error occurred")
        stopAll()
        setState("idle")
      }

      recorder.start(100)
      setState("recording")
      setDuration(0)

      timerInterval.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= voiceDurationLimitSec - 1) {
            stopRecording()
            return voiceDurationLimitSec
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      setState("idle")
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("NotAllowed") || msg.includes("Permission"))
        toast.error("Mic permission denied. Check your browser settings.")
      else if (msg.includes("NotFound"))
        toast.error("No microphone found on this device.")
      else
        toast.error(msg || "Could not access microphone.")
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop()
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }

  function handleReRecord() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setDuration(0)
    setState("idle")
  }

  async function handleSubmit() {
    if (!audioUrl && !textFeedback.trim()) return
    setState("uploading")

    try {
      let submittedAudioUrl: string | undefined

      if (audioUrl) {
        const audioBlob = await fetch(audioUrl).then((r) => r.blob())
        const ext = audioBlob.type.includes("mp4") || audioBlob.type.includes("aac") ? "mp4" : "webm"

        const config = await api.public.getUploadSignature(slug)
        const formData = new FormData()
        formData.append("file", audioBlob, `recording.${ext}`)
        formData.append("folder", config.folder)
        formData.append("upload_preset", config.uploadPreset)

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
          { method: "POST", body: formData }
        )

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}))
          throw new Error((err as { error?: { message?: string } }).error?.message ?? "Upload failed")
        }

        const uploadData = (await uploadRes.json()) as { secure_url: string; bytes: number }
        submittedAudioUrl = uploadData.secure_url
      }

      await api.public.submitResponse(slug, {
        audioUrl: submittedAudioUrl,
        durationSec: audioUrl ? duration : undefined,
        sizeBytes: audioUrl ? undefined : undefined,
        textFeedback: textFeedback.trim() || undefined,
      })

      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setState("done")
      toast.success("Response submitted successfully")
      onComplete()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit response")
      setState("stopped")
    }
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-foreground">Response submitted</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {state === "recording" ? (
        <div className="flex items-center justify-center py-4">
          <RecordingIndicator />
        </div>
      ) : state === "stopped" && audioUrl ? (
        <audio src={audioUrl} controls className="w-full h-10" />
      ) : null}

      <div className="text-center">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {fmt(duration)}
        </span>
        <span className="text-sm text-muted-foreground"> / {fmt(voiceDurationLimitSec)}</span>
      </div>

      {textFeedbackEnabled && (
        <div className="space-y-1.5">
          <label htmlFor="text-feedback" className="text-xs font-medium text-muted-foreground">
            <MessageSquareText className="mr-1 inline h-3 w-3" />
            Written feedback {state === "idle" ? "" : "(optional)"}
          </label>
          <textarea
            id="text-feedback"
            value={textFeedback}
            onChange={(e) => setTextFeedback(e.target.value)}
            placeholder="Type your thoughts..."
            rows={2}
            className="w-full max-w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring box-border"
          />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {state === "idle" && (
          <>
            <Button onClick={startRecording} className="gap-2" size="lg">
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
            {textFeedbackEnabled && textFeedback.trim() && (
              <Button onClick={handleSubmit} variant="secondary" className="gap-2" size="lg">
                <Upload className="h-4 w-4" />
                Submit Text
              </Button>
            )}
          </>
        )}

        {state === "requesting-mic" && (
          <Button disabled className="gap-2" size="lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting mic access...
          </Button>
        )}

        {state === "recording" && (
          <Button onClick={stopRecording} variant="destructive" className="gap-2" size="lg">
            <Square className="h-4 w-4" />
            Stop Recording
          </Button>
        )}

        {state === "stopped" && (
          <>
            <Button onClick={handleReRecord} variant="outline" size="lg" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Re-record
            </Button>
            <Button onClick={handleSubmit} className="gap-2" size="lg">
              <Upload className="h-4 w-4" />
              Submit
            </Button>
          </>
        )}

        {state === "uploading" && (
          <Button disabled className="gap-2" size="lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </Button>
        )}
      </div>
    </div>
  )
}
