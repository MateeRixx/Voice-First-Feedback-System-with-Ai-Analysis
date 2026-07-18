import { Mic } from "lucide-react"

export default function AnimatedHero() {
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      {/* Ambient glow rings — using design system tokens */}
      <div className="absolute inset-0 animate-pulse-soft rounded-full bg-primary/5 blur-xl" />
      <div className="absolute inset-3 animate-pulse-slow rounded-full bg-primary/10 blur-lg" />
      <div className="absolute inset-6 animate-pulse-medium rounded-full bg-primary/[0.07] blur-md" />

      {/* Floating particles — subtle, neutral */}
      <div className="absolute -top-1 left-7 h-2 w-2 animate-float-slow rounded-full bg-primary/20" />
      <div className="absolute bottom-5 right-5 h-1.5 w-1.5 animate-float-medium rounded-full bg-primary/15" />
      <div className="absolute left-4 top-14 h-1 w-1 animate-float-fast rounded-full bg-primary/10" />
      <div className="absolute right-9 top-9 h-1.5 w-1.5 animate-float-slow rounded-full bg-primary/15" />
      <div className="absolute bottom-10 left-9 h-1 w-1 animate-float-medium rounded-full bg-primary/10" />

      {/* Waveform bars */}
      <div className="absolute flex items-center gap-[3px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-primary/25"
            style={{
              height: `${12 + Math.sin(i * 0.8) * 8 + 4}px`,
              animation: `waveform 2.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Mic icon — using design system token, matching Login page */}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Mic className="h-8 w-8 text-primary" />
      </div>
    </div>
  )
}
