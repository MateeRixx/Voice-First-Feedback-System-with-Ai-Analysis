import { Mic } from "lucide-react"

export default function AnimatedHero() {
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      {/* Ambient glow rings */}
      <div className="absolute inset-0 animate-pulse-soft rounded-full bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 blur-xl" />
      <div className="absolute inset-2 animate-pulse-slow rounded-full bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10 blur-lg" />
      <div className="absolute inset-4 animate-pulse-medium rounded-full bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 blur-md" />

      {/* Floating particles */}
      <div className="absolute -top-2 left-6 h-2 w-2 animate-float-slow rounded-full bg-violet-400/30" />
      <div className="absolute bottom-4 right-4 h-1.5 w-1.5 animate-float-medium rounded-full bg-fuchsia-400/25" />
      <div className="absolute left-3 top-12 h-1 w-1 animate-float-fast rounded-full bg-cyan-400/20" />
      <div className="absolute right-8 top-8 h-2 w-2 animate-float-slow rounded-full bg-amber-400/20" />
      <div className="absolute bottom-8 left-8 h-1.5 w-1.5 animate-float-medium rounded-full bg-rose-400/20" />

      {/* Waveform bars around mic */}
      <div className="absolute flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-violet-400/40 to-fuchsia-400/40"
            style={{
              height: `${12 + Math.sin(i * 0.8) * 8 + 4}px`,
              animation: `waveform 2.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Mic icon */}
      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
        <Mic className="h-9 w-9 text-white" />
      </div>
    </div>
  )
}
