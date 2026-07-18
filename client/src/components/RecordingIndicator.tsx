export default function RecordingIndicator() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      {/* Red recording dot */}
      <div className="relative z-10 h-4 w-4 rounded-full bg-red-500">
        <div className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
      </div>

      {/* Ripple rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-primary/40"
          style={{
            animation: `ripple-ring 1.8s ease-out ${i * 0.6}s infinite`,
          }}
        />
      ))}

      <style>{`
        @keyframes ripple-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
