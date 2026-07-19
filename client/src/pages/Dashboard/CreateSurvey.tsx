import { useState } from "react"
import { api, type MediaItem } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2, Mic, MessageSquareText, Globe, Zap, Image, Video, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const defaultMedia = (): MediaItem[] => []

export default function CreateSurvey({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState(120)
  const [textFeedback, setTextFeedback] = useState(false)
  const [autoPublish, setAutoPublish] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [thankYouMessage, setThankYouMessage] = useState("")
  const [media, setMedia] = useState<MediaItem[]>(defaultMedia)
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [mediaUrl, setMediaUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function addMedia() {
    const url = mediaUrl.trim()
    if (!url) return
    if (!url.startsWith("http://") && !url.startsWith("https://")) return
    setMedia((prev) => [...prev, { type: mediaType, url, caption: "" }])
    setMediaUrl("")
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCaption(index: number, caption: string) {
    setMedia((prev) => prev.map((item, i) => (i === index ? { ...item, caption } : item)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError("")
    try {
      const theme: Record<string, unknown> = {}
      if (welcomeMessage.trim()) theme.welcomeMessage = welcomeMessage.trim()
      if (thankYouMessage.trim()) theme.thankYouMessage = thankYouMessage.trim()

      const result = await api.surveys.create({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        voiceDurationLimitSec: duration,
        textFeedbackEnabled: textFeedback,
        theme: Object.keys(theme).length > 0 ? theme : undefined,
        media: media.length > 0 ? media : undefined,
      })

      if (autoPublish) {
        await api.surveys.publish(result.survey.id)
      }

      resetForm()
      onCreated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey")
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setTitle("")
    setSubtitle("")
    setDescription("")
    setDuration(120)
    setTextFeedback(false)
    setAutoPublish(false)
    setWelcomeMessage("")
    setThankYouMessage("")
    setMedia(defaultMedia)
    setMediaUrl("")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Survey</DialogTitle>
          <DialogDescription>
            Configure your voice feedback survey.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-dashed p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                Quick Review
              </p>
              <p className="text-xs text-muted-foreground">
                One-field voice survey — 10 seconds, auto-publish
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => {
                setTitle("Quick Review")
                setSubtitle("")
                setDescription("")
                setDuration(10)
                setTextFeedback(false)
                setAutoPublish(true)
                setWelcomeMessage("")
                setThankYouMessage("Thanks for your quick feedback!")
                setMedia([])
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              Fill preset
            </Button>
          </div>
        </div>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic Info</p>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Product Feedback Q3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                placeholder="Help us shape the future of our product"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                Concept / Idea Description
                <span className="text-xs text-muted-foreground ml-2 font-normal">Shown to respondents before they record</span>
              </Label>
              <textarea
                id="description"
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]"
                placeholder="Describe your idea, problem, or concept here. This will be shown to respondents before they record their feedback..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Media */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Image className="h-3 w-3" /> Reference Media
            </p>
            <p className="text-xs text-muted-foreground">
              Add images or videos to show respondents what they're giving feedback on.
            </p>

            {media.length > 0 && (
              <div className="space-y-2">
                {media.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                      {item.type === "image" ? (
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                      <Input
                        placeholder="Caption (optional)"
                        value={item.caption ?? ""}
                        onChange={(e) => updateCaption(i, e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="mt-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="Remove media"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={cn("px-2.5 py-1.5 text-xs font-medium transition-colors", mediaType === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  aria-label="Image media"
                  aria-pressed={mediaType === "image"}
                >
                  <Image className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={cn("px-2.5 py-1.5 text-xs font-medium transition-colors", mediaType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  aria-label="Video media"
                  aria-pressed={mediaType === "video"}
                >
                  <Video className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                placeholder="Paste image/video URL..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMedia() } }}
                className="flex-1 h-9 text-sm"
              />
              <Button type="button" size="sm" variant="outline" className="gap-1 shrink-0 h-9" onClick={addMedia} disabled={!mediaUrl.trim()}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* Voice Settings */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="h-3 w-3" /> Voice Settings
              </p>
              <div className="space-y-2">
                <Label htmlFor="duration">Max recording duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={300}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Recommended: 60-120 seconds</p>
              </div>
            </div>

            {/* Text Feedback */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquareText className="h-3 w-3" /> Text Feedback
              </p>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="text">Allow text responses</Label>
                  <p className="text-xs text-muted-foreground">Let respondents add written feedback alongside voice</p>
                </div>
                <Switch id="text" checked={textFeedback} onCheckedChange={setTextFeedback} />
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Messages</p>
              <div className="space-y-2">
                <Label htmlFor="welcome">Welcome message</Label>
                <Input
                  id="welcome"
                  placeholder="Speak your mind — your feedback is anonymous"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thanks">Thank you message</Label>
                <Input
                  id="thanks"
                  placeholder="Thanks for your feedback! We'll review it shortly."
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                />
              </div>
            </div>

            {/* Publishing */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Publishing
              </p>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="publish">Auto-publish after creation</Label>
                  <p className="text-xs text-muted-foreground">Survey goes live immediately — no manual publish needed</p>
                </div>
                <Switch id="publish" checked={autoPublish} onCheckedChange={setAutoPublish} />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create survey
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
