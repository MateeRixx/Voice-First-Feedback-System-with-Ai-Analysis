import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import { authRouter } from "./routes/auth"
import { surveyRouter } from "./routes/survey"
import { dashboardRouter } from "./routes/dashboard"
import { publicRouter } from "./routes/public"
import { startQueue } from "./lib/job-queue"
import { startWorker } from "./lib/worker"
import { errorHandler } from "./middleware/errorHandler"

dotenv.config()

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}

const app = express()

app.use(helmet())
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://127.0.0.1:5173", "http://localhost:5173"]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
}))
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))
app.use(express.json({ limit: "1mb" }))
app.use(cookieParser())

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.use("/api/public", publicLimiter, publicRouter)
app.use("/api/auth", authLimiter, authRouter)
app.use("/api/surveys", surveyRouter)
app.use("/api/dashboard", dashboardRouter)

app.use(errorHandler)

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
})
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err)
  process.exit(1)
})

async function start() {
  try {
    await startQueue()
    startWorker()
  } catch (err) {
    console.error("failed to start queue:", err)
    process.exit(1)
  }
}

start().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`listening on 0.0.0.0:${PORT}`)
  })
})

export default app
