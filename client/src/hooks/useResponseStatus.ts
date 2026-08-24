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

    const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api"
    const wsBase = API_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "")
    const ws = new WebSocket(`${wsBase}/ws/response/${responseId}`)

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
