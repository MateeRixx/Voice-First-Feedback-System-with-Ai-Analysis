import { useState, useCallback, useEffect, useRef } from "react"
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const DURATION = 4000
const MAX_VISIBLE = 5

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
  createdAt: number
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: number) => void
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
}

const progressStyles: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error: "bg-destructive",
  warning: "bg-amber-500",
  info: "bg-blue-500",
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [remaining, setRemaining] = useState(DURATION)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const left = Math.max(0, DURATION - elapsed)
      setRemaining(left)
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        onDismiss(toast.id)
      }
    }, 50)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, toast.id, onDismiss])

  const Icon = icons[toast.type]
  const pct = (remaining / DURATION) * 100

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
        "animate-in slide-in-from-right-2 fade-in-0",
        styles[toast.type],
      )}
      onMouseEnter={() => {
        startRef.current = Date.now() - (DURATION - remaining)
        setPaused(true)
      }}
      onMouseLeave={() => {
        startRef.current = Date.now()
        setPaused(false)
      }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="mt-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden bg-foreground/5">
        <div
          className={cn("h-full transition-all duration-75 ease-linear", progressStyles[toast.type])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

let listeners: Array<(toast: Toast) => void> = []
let idCounter = 0

function emit(type: ToastType, message: string) {
  const toast: Toast = { id: ++idCounter, message, type, createdAt: Date.now() }
  listeners.forEach((fn) => fn(toast))
  return toast.id
}

export const toast = {
  success: (msg: string) => emit("success", msg),
  error: (msg: string) => emit("error", msg),
  warning: (msg: string) => emit("warning", msg),
  info: (msg: string) => emit("info", msg),
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => {
      const dupe = prev.find((x) => x.message === t.message && x.type === t.type)
      if (dupe) return prev
      return [...prev, t].slice(-MAX_VISIBLE)
    })
  }, [])

  useEffect(() => {
    listeners.push(addToast)
    return () => { listeners = listeners.filter((fn) => fn !== addToast) }
  }, [addToast])

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  )
}
