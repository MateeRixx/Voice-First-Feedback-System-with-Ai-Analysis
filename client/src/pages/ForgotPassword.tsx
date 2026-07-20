import { useState } from "react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MicVocal, Loader2, CheckCircle2 } from "lucide-react"

type Step = "email" | "question" | "reset" | "done"

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [question, setQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await api.getSecurityQuestion(email)
      setQuestion(res.question)
      setStep("question")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find account")
    } finally {
      setLoading(false)
    }
  }

  async function handleAnswerSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!securityAnswer) {
      setError("Please enter your security answer")
      return
    }
    setError("")
    setStep("reset")
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    setError("")
    setLoading(true)
    try {
      await api.resetPassword(email, securityAnswer, newPassword)
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
      setStep("question")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center"
        style={{ backgroundImage: "url(https://res.cloudinary.com/dujqqwfym/image/upload/v1784411951/marco-palumbo-wsBpv17zWWk-unsplash_ikpujo.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative text-center px-8 max-w-md">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <MicVocal className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>TrueTone</h1>
          <p className="text-lg text-white/90 leading-relaxed" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
            Reset your password using your security question.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center lg:hidden mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4">
              <MicVocal className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">TrueTone</h1>
            <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
          </div>

          {step === "email" && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">Forgot password?</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your email to get started.</p>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Looking up..." : "Continue"}
                </Button>
              </form>
            </>
          )}

          {step === "question" && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">Security question</h2>
                <p className="text-sm text-muted-foreground mt-1">Answer the security question for this account.</p>
              </div>
              <form onSubmit={handleAnswerSubmit} className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium text-foreground">{question}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="securityAnswer">Your answer</Label>
                  <Input
                    id="securityAnswer"
                    type="text"
                    placeholder="Enter your answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Verifying..." : "Continue"}
                </Button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">Set new password</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account.</p>
              </div>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || newPassword.length < 8}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Resetting..." : "Reset password"}
                </Button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Password reset successful</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You can now sign in with your new password.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}

          {step !== "done" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to="/login" className="font-medium text-foreground hover:underline underline-offset-4">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
