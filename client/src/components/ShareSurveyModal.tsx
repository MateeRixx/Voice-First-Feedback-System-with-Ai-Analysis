import { useEffect, useState, useCallback } from "react"
import { toDataURL } from "qrcode"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Mail,
  Loader2,
  Check,
  QrCode,
  Download,
  AlertCircle,
} from "lucide-react"
import { toast } from "@/components/ui/toast"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveySlug: string
  surveyTitle: string
}

const QR_SIZE = 200

export default function ShareSurveyModal({ open, onOpenChange, surveySlug, surveyTitle }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState(false)
  const [copied, setCopied] = useState(false)

  const surveyUrl = `${window.location.origin}/survey/${surveySlug}`
  const emailSubject = `Feedback requested: ${surveyTitle}`
  const emailBody = `Hi,\n\nWe'd love to hear your thoughts. Please record a quick voice message here:\n\n${surveyUrl}\n\nThanks!`

  useEffect(() => {
    if (!open) return

    setQrLoading(true)
    setQrError(false)
    setQrDataUrl("")

    toDataURL(surveyUrl, {
      width: QR_SIZE,
      margin: 2,
      color: { dark: "#09090b", light: "#ffffff" },
    })
      .then((url) => {
        setQrDataUrl(url)
        setQrLoading(false)
      })
      .catch(() => {
        setQrError(true)
        setQrLoading(false)
      })
  }, [open, surveyUrl])

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(surveyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return
    const img = new Image()
    img.onload = () => {
      const c = document.createElement("canvas")
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext("2d")!
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0)
      const link = document.createElement("a")
      link.download = `${surveyTitle.replace(/\s+/g, "-").toLowerCase()}-qr.png`
      link.href = c.toDataURL("image/png")
      link.click()
    }
    img.src = qrDataUrl
  }, [qrDataUrl, surveyTitle])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)]">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="items-center gap-2 justify-center">
            <QrCode className="h-5 w-5" />
            Share &ldquo;{surveyTitle}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg border p-1.5 bg-white">
            {qrLoading ? (
              <div className="flex items-center justify-center w-[140px] h-[140px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : qrError ? (
              <div className="flex flex-col items-center justify-center w-[140px] h-[140px] text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <span className="text-xs text-center">Failed to generate QR</span>
              </div>
            ) : (
              <img
                src={qrDataUrl}
                alt={`QR code for ${surveyTitle}`}
                width={140}
                height={140}
                className="rounded"
              />
            )}
          </div>
          {!qrLoading && !qrError && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={handleDownload}>
              <Download className="h-3 w-3" />
              Download
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Button variant="outline" className="justify-start gap-2 w-full h-9 text-xs" onClick={handleCopyLink}>
            {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            <span className="flex-1 text-left truncate">{surveyUrl}</span>
          </Button>
          <Button variant="secondary" className="gap-2 w-full h-9 text-xs" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`) }}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
            Share via Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
