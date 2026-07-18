import { useState } from "react"
import { api } from "@/lib/api"
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
import { Loader2, Mic, MessageSquareText, Globe } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export default function CreateSurvey({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [duration, setDuration] = useState(120)
  const [textFeedback, setTextFeedback] = useState(false)
  const [autoPublish, setAutoPublish] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [thankYouMessage, setThankYouMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError("")
    try {
      const theme: Record<string, unknown> = {}
      if (welcomeMessage.trim()) theme.welcomeMessage = welcomeMessage.trim()
      if (thankYouMessage.trim()) theme.thankYouMessage = thankYouMessage.trim()

      await api.surveys.create({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        voiceDurationLimitSec: duration,
        textFeedbackEnabled: textFeedback,
        theme: Object.keys(theme).length > 0 ? theme : undefined,
      })

      if (autoPublish) {
        const surveys = await api.surveys.list()
        const created = surveys.surveys.find((s) => s.title === title.trim())
        if (created) await api.surveys.publish(created.id)
      }

      setTitle("")
      setSubtitle("")
      setDuration(120)
      setTextFeedback(false)
      setAutoPublish(false)
      setWelcomeMessage("")
      setThankYouMessage("")
      onCreated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Survey</DialogTitle>
          <DialogDescription>
            Configure your voice feedback survey.
          </DialogDescription>
        </DialogHeader>
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
          </div>

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
