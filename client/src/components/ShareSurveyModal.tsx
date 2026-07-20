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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Share &ldquo;{surveyTitle}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Share this survey link with your customers to collect voice feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-lg border p-3 bg-white">
            {qrLoading ? (
              <div className="flex items-center justify-center w-[200px] h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : qrError ? (
              <div className="flex flex-col items-center justify-center w-[200px] h-[200px] text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <span className="text-xs text-center">Failed to generate QR</span>
              </div>
            ) : (
              <img
                src={qrDataUrl}
                alt={`QR code for ${surveyTitle}`}
                width={QR_SIZE}
                height={QR_SIZE}
                className="rounded"
              />
            )}
          </div>
          {!qrLoading && !qrError && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Download as PNG
            </Button>
          )}
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Customers scan this QR code to open the survey on their phone
          </p>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="justify-start gap-3 w-full" onClick={handleCopyLink}>
            {copied ? <Check className="h-4 w-4 shrink-0 text-green-500" /> : <Copy className="h-4 w-4 shrink-0" />}
            <span className="flex-1 text-left truncate text-xs">{surveyUrl}</span>
          </Button>
          <Button variant="secondary" className="gap-2 w-full" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`) }}>
            <Mail className="h-4 w-4 shrink-0" />
            <span>Share via Email</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
