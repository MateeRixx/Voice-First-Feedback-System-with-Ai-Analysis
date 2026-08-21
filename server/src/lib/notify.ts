import { WebSocket } from "ws"

export type ProcessingStatus = "processing" | "transcribing" | "analyzing" | "done" | "failed"

export const responseClients = new Map<string, Set<WebSocket>>()

export function notifyResponseClients(responseId: string, status: ProcessingStatus, data?: Record<string, unknown>) {
  const clients = responseClients.get(responseId)
  if (!clients) return

  const message = JSON.stringify({ responseId, status, data, timestamp: Date.now() })

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}
