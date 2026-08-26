import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import { WebSocket } from "ws";
import { createRealtimeSTT, sendAudioChunk, transcribeAudio } from "./sarvam";
import { synthesizeToBuffer } from "./tts";
import { llm, streamChat, sentenceChunker } from "./llm";
import { prisma } from "./prisma";

export type Question = {
  id: string;
  text: string;
  category: "opening" | "feedback" | "clarification" | "closing";
};

export type ConversationStatus =
  | "welcome" | "asking" | "listening" | "transcribing"
  | "thinking" | "analyzing" | "done";

export type ConversationMessage =
  | { type: "agent_speak"; text: string; questionId?: string; streaming?: boolean }
  | { type: "user_transcript"; text: string; questionId: string }
  | { type: "user_partial"; text: string }
  | { type: "status"; status: ConversationStatus }
  | { type: "analysis"; insight: AIInsight }
  | { type: "error"; message: string }
  | { type: "audio"; data: string; sampleRate: number }
  | { type: "token"; text: string }
  | { type: "tts_chunk"; text: string }
  | { type: "agent_thinking" }
  | { type: "turn_complete" };

export interface AIInsight {
  summary: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
}

const DEFAULT_QUESTIONS: Question[] = [
  { id: "q1", text: "Hello! I'm your feedback assistant. Tell me — how was your recent experience with us?", category: "opening" },
  { id: "q2", text: "What did you like the most?", category: "feedback" },
  { id: "q3", text: "Was there anything that could be improved?", category: "feedback" },
  { id: "q4", text: "How likely are you to recommend us to a friend?", category: "clarification" },
  { id: "q5", text: "Anything else you'd like to share before we wrap up?", category: "closing" },
];

const RESPONDENT_SYSTEM_PROMPT = [
  "You are a friendly voice feedback agent having a casual conversation.",
  "Rules:",
  "- Max 2 sentences per response. No bullet points, no lists, no filler words like 'Great!' or 'Awesome!'.",
  "- Sound natural and conversational, like a real person on a call.",
  "- If the user gives a one-word or very short answer, probe once for more detail.",
  "- When moving to the last question, say 'Last one —' before it.",
  "- When all questions are done, say 'That's really helpful, thank you so much.' and stop.",
].join("\n");

interface SessionSTT {
  ws:          WebSocket;
  partialText: string;
}

const sttSessions = new Map<string, SessionSTT>();
const sttFailedSessions = new Set<string>();

export function initRealtimeSTT(sessionId: string, clientWs: WebSocket): void {
  if (sttFailedSessions.has(sessionId)) {
    console.log(`[STT] Session ${sessionId} previously failed, skipping STT init`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ 
        type: "stt_unavailable",
        message: "Speech-to-text service unavailable. Text input mode enabled."
      }));
    }
    return;
  }

  let stt: WebSocket | null = null;
  let sttFailed = false;
  try {
    stt = createRealtimeSTT({
      onPartial: (text) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: "user_partial", text }));
        }
        const session = sttSessions.get(sessionId);
        if (session) session.partialText = text;
      },

      onFinal: async (transcript) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: "agent_thinking" }));
        }
        await handleUserTurn(sessionId, transcript, clientWs);
      },

      onError: (err) => {
        console.error(`[STT] Session ${sessionId} error:`, err.message);
        if (err.message.includes("403") || err.message.includes("Forbidden")) {
          sttFailed = true;
          sttFailedSessions.add(sessionId);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ 
              type: "stt_unavailable",
              message: "Speech-to-text service unavailable. Text input mode enabled."
            }));
          }
        }
        cleanupSTT(sessionId);
      },

      onClose: () => {
        sttSessions.delete(sessionId);
        if (sttFailed && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ 
            type: "stt_unavailable",
            message: "STT connection failed"
          }));
        }
      },
    });

    sttSessions.set(sessionId, { ws: stt, partialText: "" });
  } catch (err) {
    console.error(`[STT] Failed to init for ${sessionId}:`, err);
    if (stt) stt.close();
    sttFailedSessions.add(sessionId);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ 
        type: "stt_unavailable",
        message: "Failed to initialize STT"
      }));
    }
  }
}

export function handleAudioChunk(sessionId: string, pcm16Buffer: Buffer): void {
  const session = sttSessions.get(sessionId);
  if (!session) {
    console.warn(`[STT] No session for ${sessionId} — dropping audio`);
    return;
  }
  sendAudioChunk(session.ws, pcm16Buffer);
}

function cleanupSTT(sessionId: string): void {
  const session = sttSessions.get(sessionId);
  if (session) {
    session.ws.close();
    sttSessions.delete(sessionId);
  }
}

class ConversationSession {
  private status: ConversationStatus = "welcome";
  private currentQuestionIndex = 0;
  private responses: Record<string, string> = {};
  private questions: Question[];
  public history: { role: "user" | "assistant"; content: string }[] = [];
  private clientWs: WebSocket;

  constructor(
    ws: WebSocket,
    private sessionId: string,
    customQuestions?: Question[],
  ) {
    this.questions = customQuestions || DEFAULT_QUESTIONS;
    this.clientWs = ws;
  }

  private send(msg: ConversationMessage) {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(msg));
    }
  }

  private setStatus(s: ConversationStatus) {
    this.status = s;
    this.send({ type: "status", status: s });
  }

  async start() {
    initRealtimeSTT(this.sessionId, this.clientWs);

    this.setStatus("speaking" as any);
    const welcome = "Hi there! I'm your feedback assistant. I'll ask you a few quick questions. Just speak naturally.";
    this.send({ type: "agent_speak", text: welcome });
    await this.speakAndWait(welcome);
    this.askNextQuestion();
  }

  private async speakAndWait(text: string): Promise<void> {
    const wav = await synthesizeToBuffer(text);
    this.send({
      type: "audio",
      data: wav.toString("base64"),
      sampleRate: 22050,
    });
    await sleep(800);
  }

  private async askNextQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.finish();
      return;
    }
    const q = this.questions[this.currentQuestionIndex];
    const isLast = this.currentQuestionIndex === this.questions.length - 1;
    const prefix = isLast ? "Last one — " : "";
    this.setStatus("asking");
    this.send({ type: "agent_speak", text: prefix + q.text, questionId: q.id });
    await this.speakAndWait(prefix + q.text);
    this.setStatus("listening");
  }

  private async handleUserTurn(transcript: string) {
    const q = this.questions[this.currentQuestionIndex];
    if (!q) return;

    this.responses[q.id] = transcript;
    this.send({ type: "user_transcript", text: transcript, questionId: q.id });
    this.history.push({ role: "user", content: transcript });

    const ack = await this.generateAck(transcript);
    if (ack) {
      this.history.push({ role: "assistant", content: ack });
    }

    this.currentQuestionIndex++;
    await sleep(300);
    this.askNextQuestion();
  }

  private async generateAck(transcript: string): Promise<string> {
    const messages = [
      { role: "system" as const, content: RESPONDENT_SYSTEM_PROMPT },
      ...this.history.slice(-6),
    ];
    let full = "";
    try {
      const stream = streamChat(messages);
      for await (const token of stream) {
        full += token;
      }
    } catch {}
    return full.trim();
  }

  private async finish() {
    this.setStatus("analyzing");

    const allText = Object.values(this.responses)
      .filter((r) => r.trim())
      .join("\n\n");

    if (!allText.trim()) {
      this.send({ type: "agent_speak", text: "I didn't catch any responses. Thanks for trying!" });
      await this.speakAndWait("I didn't catch any responses. Thanks for trying!");
      this.setStatus("done");
      return;
    }

    try {
      const insight = await llm.analyzeJSON<AIInsight>(
        [
          "Analyze this feedback conversation and return JSON with:",
          "- summary: 1-2 sentence key takeaway",
          "- sentiment: POSITIVE, NEGATIVE, NEUTRAL, or MIXED",
          "- urgency: HIGH, MEDIUM, or LOW",
          "- tags: 3-5 specific keywords",
          "Respond with valid JSON only:",
          JSON.stringify({ summary: "", sentiment: "", urgency: "", tags: [] }),
        ].join("\n"),
        allText,
      );

      this.send({ type: "analysis", insight });
      const summaryText = `Thanks! Here's what I found: ${insight.summary}. Sentiment: ${insight.sentiment}. Tags: ${insight.tags.join(", ")}. Have a great day!`;
      this.send({ type: "agent_speak", text: summaryText });
      await this.speakAndWait(summaryText);
    } catch (err) {
      this.send({ type: "error", message: (err as Error).message });
    }

    this.setStatus("done");
  }
}

async function handleUserTurn(sessionId: string, transcript: string, clientWs: WebSocket): Promise<void> {
  const t0 = Date.now();
  const session = sessions.get(sessionId);
  if (!session) return;

  session.history.push({ role: "user", content: transcript });

  let firstSentence = true;
  let fullResponse  = "";

  const tokenStream = streamChat(session.history);
  const sentenceStream = sentenceChunker(tokenStream);

  for await (const sentence of sentenceStream) {
    if (firstSentence) {
      console.log(`[LATENCY] First sentence ready: ${Date.now() - t0}ms`);
      firstSentence = false;
    }
    fullResponse += sentence;
    try {
      const wav = await synthesizeToBuffer(sentence);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type:       "audio",
          data:       wav.toString("base64"),
          sampleRate: 22050,
        }));
      }
    } catch (err) {
      console.error("[TTS] Bulbul error, falling back:", err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "tts_chunk", text: sentence }));
      }
    }
  }

  console.log(`[LATENCY] Full turn: ${Date.now() - t0}ms`);
  session.history.push({ role: "assistant", content: fullResponse });
  if (clientWs.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify({ type: "turn_complete" }));
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const sessions = new Map<string, ConversationSession>();

export async function handleConversationMessage(ws: WebSocket, sessionId: string, data: Buffer) {
  let msg: { type: string; audio?: string; surveyId?: string };
  try {
    msg = JSON.parse(data.toString());
  } catch {
    ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    return;
  }

  if (msg.type === "start") {
    if (sessions.has(sessionId)) return;

    let questions = DEFAULT_QUESTIONS;
    if (msg.surveyId) {
      try {
        const survey = await prisma.survey.findUnique({ where: { id: msg.surveyId } }) as any;
        if (survey?.questions && Array.isArray(survey.questions)) {
          questions = survey.questions as Question[];
        }
      } catch (err) {
        console.error("Failed to load survey questions:", err);
      }
    }

    const session = new ConversationSession(ws, sessionId, questions);
    sessions.set(sessionId, session);
    session.start();
    return;
  }

  if (msg.type === "audio_chunk" && msg.audio) {
    const pcm = Buffer.from(msg.audio, "base64");
    handleAudioChunk(sessionId, pcm);
    return;
  }

  if (msg.type === "user_text" && msg.text) {
    const session = sessions.get(sessionId);
    if (!session) return;
    // Handle text input directly (bypass STT)
    session.handleUserTurn(msg.text);
    return;
  }

  if (msg.type === "audio" && msg.audio) {
    // Legacy audio message type - not used with realtime STT
    const session = sessions.get(sessionId);
    if (!session) return;
    // Could add legacy handling here if needed
    return;
  }
}

export function cleanupSession(sessionId: string) {
  sessions.delete(sessionId);
  cleanupSTT(sessionId);
  sttFailedSessions.delete(sessionId);
}