import { useEffect, useRef } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api"
const INTERVAL_MS = 5 * 60 * 1000

export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const ping = () => {
      fetch(`${API_BASE}/health`, { method: "GET", cache: "no-store" })
        .catch(() => {})
    }

    ping()
    intervalRef.current = setInterval(ping, INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
}
