import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import { createServer } from "http"
import { WebSocketServer } from "ws"
import { authRouter } from "./routes/auth"
import { surveyRouter } from "./routes/survey"
import { dashboardRouter } from "./routes/dashboard"
import { publicRouter } from "./routes/public"
import { startQueue } from "./lib/job-queue"
import { startWorker } from "./lib/worker"
import { errorHandler } from "./middleware/errorHandler"
import { responseClients } from "./lib/notify"
import { handleConversationMessage, cleanupSession, initRealtimeSTT, handleAudioChunk } from "./lib/conversation-handler"
import { handleAdminMessage, cleanupAdminSession } from "./lib/admin-session-handler"

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
  : ["http://127.0.0.1:5173", "http://localhost:5173", "https://voice-first-feedback-system-with-ai-analysis-jxnd8qv1k.vercel.app"]

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
  res.json({ status: "ok", timestamp: new Date().toISOString(), port: PORT })
})

app.get("/", (_req, res) => {
  res.json({ message: "TrueTone API is running", status: "success", port: PORT })
})

// Check if WebSocket server is ready
app.get("/api/ws-status", (_req, res) => {
  res.json({ wsClients: wss.clients.size })
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

const httpServer = createServer(app)

const wss = new WebSocketServer({ server: httpServer })

wss.on("connection", (ws, req) => {
  console.log("[WS] Raw URL:", req.url)
  console.log("[WS] Headers host:", req.headers.host)
  
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost:3000"}`)
  const pathParts = url.pathname.split("/").filter(Boolean)

  console.log("[WS] Parsed path:", pathParts)

  // Conversation WebSocket: /ws/conversation/:sessionId
  if (pathParts[0] === "ws" && pathParts[1] === "conversation" && pathParts[2]) {
    const sessionId = pathParts[2]
    console.log("[WS] Conversation session:", sessionId)
    
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "session_init") {
          initRealtimeSTT(sessionId, ws);
          // Auto-start conversation after STT is initialized
          handleConversationMessage(ws, sessionId, Buffer.from(JSON.stringify({ 
            type: "start", 
            surveyId: msg.surveyId 
          })));
        } else if (msg.type === "audio_chunk") {
          const pcm = Buffer.from(msg.data, "base64");
          handleAudioChunk(sessionId, pcm);
        } else if (msg.type === "session_end") {
          cleanupSession(sessionId);
        } else {
          handleConversationMessage(ws, sessionId, data as Buffer);
        }
      } catch (err) {
        console.error("[WS] Message error:", err);
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    });
    
    ws.on("error", (err) => {
      console.error("[WS] Socket error:", err);
    });
    
    ws.on("close", (code, reason) => {
      console.log("[WS] Close:", code, reason.toString());
      cleanupSession(sessionId);
    });
    
    ws.send(JSON.stringify({ type: "status", status: "connected" }));
    return;
  }

  // Admin survey creation WebSocket: /ws/survey-creation/:sessionId/:orgId
  if (pathParts[0] === "ws" && pathParts[1] === "survey-creation" && pathParts[2] && pathParts[3]) {
    const sessionId = pathParts[2]
    const orgId = pathParts[3]
    console.log("[WS] Admin session:", sessionId, "orgId:", orgId)
    ws.on("message", (data) => handleAdminMessage(ws, sessionId, orgId, data as Buffer))
    ws.on("close", () => cleanupAdminSession(sessionId))
    ws.send(JSON.stringify({ type: "status", status: "connected" }))
    return
  }

  console.log("[WS] No match for path:", pathParts, "— closing")
  ws.close()
})

start().then(() => {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`listening on 0.0.0.0:${PORT}`)
    console.log(`WebSocket server ready on ws://localhost:${PORT}`)
  })
})

export default app
