import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import { Play, Pause } from "lucide-react"

interface AudioPlayerProps {
  audioUrl: string
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(var(--muted))",
      progressColor: "hsl(var(--primary) / 0.6)",
      cursorColor: "hsl(var(--primary))",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      normalize: true,
    })

    ws.load(audioUrl)
    ws.on("ready", () => setReady(true))
    ws.on("finish", () => setPlaying(false))
    ws.on("error", () => setError(true))

    wavesurferRef.current = ws
    return () => {
      ws.destroy()
      wavesurferRef.current = null
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (!wavesurferRef.current || !ready) return
    wavesurferRef.current.playPause()
    setPlaying((prev) => !prev)
  }

  if (error) {
    return <p className="text-xs text-muted-foreground">Audio unavailable</p>
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>
      <div ref={containerRef} className="flex-1 min-w-0" />
      {!ready && (
        <span className="text-xs text-muted-foreground shrink-0">Loading...</span>
      )}
    </div>
  )
}
