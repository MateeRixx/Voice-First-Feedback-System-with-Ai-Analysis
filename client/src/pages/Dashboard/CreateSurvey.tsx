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
import { Loader2 } from "lucide-react"

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError("")
    try {
      await api.surveys.create({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        voiceDurationLimitSec: duration,
        textFeedbackEnabled: textFeedback,
      })
      setTitle("")
      setSubtitle("")
      setDuration(120)
      setTextFeedback(false)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Survey</DialogTitle>
          <DialogDescription>
            Create a voice feedback survey to start collecting responses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="duration">Voice duration limit (seconds)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="text">Text feedback</Label>
              <p className="text-xs text-muted-foreground">Allow written responses alongside voice</p>
            </div>
            <Switch id="text" checked={textFeedback} onCheckedChange={setTextFeedback} />
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
