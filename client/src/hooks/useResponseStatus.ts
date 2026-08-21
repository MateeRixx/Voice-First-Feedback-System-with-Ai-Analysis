import { useEffect, useState } from "react"

export type ProcessingStatus = "pending" | "processing" | "transcribing" | "analyzing" | "done" | "failed"

interface StatusMessage {
  responseId: string
  status: ProcessingStatus
  data?: Record<string, unknown>
  timestamp: number
}

export function useResponseStatus(responseId: string | null) {
  const [status, setStatus] = useState<ProcessingStatus>("pending")
  const [data, setData] = useState<Record<string, unknown> | undefined>()

  useEffect(() => {
    if (!responseId) return

    const WS_BASE = import.meta.env.VITE_API_WS_URL || "ws://localhost:3000"
    const ws = new WebSocket(`${WS_BASE}/ws/response/${responseId}`)

    ws.onmessage = (event) => {
      try {
        const msg: StatusMessage = JSON.parse(event.data)
        setStatus(msg.status)
        setData(msg.data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => setStatus("failed")

    return () => ws.close()
  }, [responseId])

  return { status, data }
}
