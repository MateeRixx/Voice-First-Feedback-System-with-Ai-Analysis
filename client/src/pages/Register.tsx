import { useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MicVocal, Loader2, Eye, EyeOff, Check, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What is your favorite book?",
  "What is your favorite food?",
]

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Weak", color: "bg-destructive" }
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-400" }
  if (score <= 3) return { score, label: "Good", color: "bg-amber-400" }
  if (score <= 4) return { score, label: "Strong", color: "bg-emerald-400" }
  return { score, label: "Very strong", color: "bg-emerald-500" }
}

const MIN_LENGTH = 8

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [showQuestions, setShowQuestions] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const strength = useMemo(() => getStrength(password), [password])

  const meetsLength = password.length >= MIN_LENGTH
  const meetsMixed = /[a-z]/.test(password) && /[A-Z]/.test(password)
  const meetsNumber = /\d/.test(password)
  const meetsSpecial = /[^a-zA-Z0-9]/.test(password)
  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const canSubmit = meetsLength && passwordsMatch && securityQuestion && securityAnswer.length >= 2 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`)
      return
    }
    if (!securityQuestion) {
      setError("Please select a security question")
      return
    }
    if (securityAnswer.length < 2) {
      setError("Security answer must be at least 2 characters")
      return
    }
    setLoading(true)
    try {
      await register(email, password, orgName, securityQuestion, securityAnswer)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
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
            Create your account and start collecting voice feedback with AI-powered analysis.
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
            <p className="text-sm text-muted-foreground mt-1">Voice feedback with AI-powered analysis</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">Start collecting voice feedback in minutes.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {password && (
              <div className="space-y-2">
                <div className="flex h-1.5 gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-full flex-1 rounded-full transition-colors",
                        i < strength.score ? strength.color : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Strength: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_LENGTH}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={MIN_LENGTH}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Security question</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowQuestions((p) => !p)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className={securityQuestion ? "" : "text-muted-foreground"}>
                    {securityQuestion || "Choose a security question"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showQuestions && "rotate-180")} />
                </button>
                {showQuestions && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md">
                    {SECURITY_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setSecurityQuestion(q)
                          setShowQuestions(false)
                        }}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                          q === securityQuestion ? "bg-accent font-medium" : "hover:bg-accent"
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityAnswer">Security answer</Label>
              <Input
                id="securityAnswer"
                type="text"
                placeholder="Your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Used to verify your identity if you forget your password.</p>
            </div>

            {password && (
              <div className="space-y-1.5 text-xs">
                <div className={cn("flex items-center gap-1.5", meetsLength ? "text-emerald-500" : "text-muted-foreground")}>
                  {meetsLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  At least {MIN_LENGTH} characters
                </div>
                <div className={cn("flex items-center gap-1.5", meetsMixed ? "text-emerald-500" : "text-muted-foreground")}>
                  {meetsMixed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  Uppercase & lowercase letters
                </div>
                <div className={cn("flex items-center gap-1.5", meetsNumber ? "text-emerald-500" : "text-muted-foreground")}>
                  {meetsNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  At least one number
                </div>
                <div className={cn("flex items-center gap-1.5", meetsSpecial ? "text-emerald-500" : "text-muted-foreground")}>
                  {meetsSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  At least one special character
                </div>
                {confirmPassword && (
                  <div className={cn("flex items-center gap-1.5", passwordsMatch ? "text-emerald-500" : "text-destructive")}>
                    {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Passwords match
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-foreground hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
