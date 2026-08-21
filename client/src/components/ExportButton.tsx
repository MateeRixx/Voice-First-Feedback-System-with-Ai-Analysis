import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { Download, Loader2 } from "lucide-react"

interface ExportButtonProps {
  surveyId: string
  surveyTitle?: string
}

export default function ExportButton({ surveyId, surveyTitle }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const blob = await api.surveys.exportCSV(surveyId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(surveyTitle || surveyId).replace(/[^a-z0-9]/gi, "_")}_responses.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  )
}
