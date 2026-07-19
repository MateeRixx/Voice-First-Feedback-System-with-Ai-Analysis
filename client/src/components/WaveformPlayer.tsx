import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"

interface WaveformPlayerProps {
  audioUrl: string
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onTimeUpdate: (currentTime: number, duration: number) => void
  onFinish: () => void
  onReady: () => void
}

export default function WaveformPlayer({
  audioUrl,
  isPlaying,
  onPlay,
  onPause,
  onTimeUpdate,
  onFinish,
  onReady,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [loaded, setLoaded] = useState(false)

  const onPlayRef = useRef(onPlay)
  const onPauseRef = useRef(onPause)
  const onFinishRef = useRef(onFinish)
  const onReadyRef = useRef(onReady)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  onPlayRef.current = onPlay
  onPauseRef.current = onPause
  onFinishRef.current = onFinish
  onReadyRef.current = onReady
  onTimeUpdateRef.current = onTimeUpdate

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(var(--primary) / 0.2)",
      progressColor: "hsl(var(--primary) / 0.6)",
      cursorColor: "hsl(var(--primary))",
      cursorWidth: 1,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 80,
      normalize: true,
      backend: "WebAudio",
      minPxPerSec: 50,
      fillParent: true,
      autoScroll: true,
      autoCenter: true,
    })

    wavesurferRef.current = ws

    ws.on("ready", () => {
      setLoaded(true)
      onReadyRef.current()
    })

    ws.on("play", () => onPlayRef.current())
    ws.on("pause", () => onPauseRef.current())
    ws.on("finish", () => onFinishRef.current())

    ws.on("timeupdate", (currentTime) => {
      const duration = ws.getDuration()
      onTimeUpdateRef.current(currentTime, duration)
    })

    ws.load(audioUrl)

    return () => {
      ws.destroy()
      wavesurferRef.current = null
      setLoaded(false)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!wavesurferRef.current || !loaded) return
    if (isPlaying) {
      wavesurferRef.current.play()
    } else {
      wavesurferRef.current.pause()
    }
  }, [isPlaying, loaded])

  return (
    <div className="relative rounded-lg border bg-background overflow-hidden">
      <div ref={containerRef} className="w-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1 w-1 animate-pulse rounded-full bg-primary" />
            Loading waveform...
          </div>
        </div>
      )}
    </div>
  )
}
