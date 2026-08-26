import "dotenv/config";
import { WebSocket } from "ws";
import { prisma } from "./prisma";
import { transcribeAudio } from "./sarvam";
import { llm, sentenceChunker, streamChat } from "./llm";
import fs from "fs";
import path from "path";
import os from "os";

export type AdminMessage =
  | { type: "agent_speak"; text: string; streaming?: boolean }
  | { type: "user_transcript"; text: string }
  | { type: "status"; status: string }
  | { type: "survey_created"; surveyId: string; slug: string; title: string; link: string }
  | { type: "error"; message: string };

const SYSTEM_PROMPT = [
  "You are a friendly survey creation assistant.",
  "Rules:",
  "- Max 2 sentences per response. No bullet points, no lists, no filler words.",
  "- Be conversational and natural, like talking to a colleague.",
  "- When the user shares their product, acknowledge briefly then ask for questions.",
  "- When questions are captured, list them numbered and ask for confirmation.",
  "- If the user says a one-word or very short answer, probe once for more detail.",
  "- End with exact phrase: 'That's really helpful, thank you so much.'",
].join("\n");

class AdminCreationSession {
  private step: "greeting" | "product_info" | "questions" | "confirm" | "creating" | "done" = "greeting";
  private orgId: string;
  private productInfo = "";
  private questions: string[] = [];
  private history: { role: "user" | "assistant"; content: string }[] = [];

  constructor(
    private ws: WebSocket,
    private sessionId: string,
    orgId: string,
  ) {
    this.orgId = orgId;
  }

  private send(msg: AdminMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setStatus(s: string) {
    this.send({ type: "status", status: s });
  }

  async start() {
    this.setStatus("speaking");
    const greeting = "Hi! I'm your survey creation assistant. Tell me about your product or service, and I'll help you create a feedback survey.";
    this.send({ type: "agent_speak", text: greeting });
  }

  async handleAudio(audioBuffer: Buffer) {
    this.setStatus("transcribing");
    try {
      const transcript = await transcribeAudio(audioBuffer);
      if (!transcript.trim()) {
        this.setStatus("listening");
        return;
      }

      this.send({ type: "user_transcript", text: transcript });
      this.history.push({ role: "user", content: transcript });

      // Stream response
      this.setStatus("speaking");
      const fullResponse = await this.streamResponse(transcript);
      this.history.push({ role: "assistant", content: fullResponse });

      // Process based on step
      await this.processStep(transcript, fullResponse);
    } catch (err) {
      console.error("Admin error:", err);
      this.send({ type: "error", message: (err as Error).message });
      this.setStatus("listening");
    }
  }

  private async streamResponse(userMessage: string): Promise<string> {
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...this.history.slice(-10),
      { role: "user" as const, content: userMessage },
    ];

    let fullText = "";
    const stream = streamChat(messages);
    const chunks = sentenceChunker(stream);
    let firstSentence = true;

    for await (const sentence of chunks) {
      fullText += sentence;
      if (firstSentence) {
        // Send first sentence immediately for fast TTS
        this.send({ type: "agent_speak", text: sentence, streaming: true });
        firstSentence = false;
      }
    }

    // If no complete sentences, send what we have
    if (!firstSentence === false && fullText.trim()) {
      this.send({ type: "agent_speak", text: fullText.trim(), streaming: true });
    }

    return fullText.trim();
  }

  private async processStep(transcript: string, response: string) {
    const lower = transcript.toLowerCase();

    switch (this.step) {
      case "greeting": {
        this.productInfo = transcript;
        this.step = "questions";
        break;
      }

      case "questions": {
        const extracted = this.extractQuestions(transcript);
        this.questions.push(...extracted);
        if (this.questions.length >= 3) {
          this.step = "confirm";
        }
        break;
      }

      case "confirm": {
        if (lower.includes("yes") || lower.includes("create") || lower.includes("confirm") || lower.includes("go ahead")) {
          await this.createSurvey();
          return;
        }
        if (lower.includes("change") || lower.includes("edit")) {
          this.step = "questions";
          this.questions = [];
        }
        break;
      }
    }

    this.setStatus("listening");
  }

  private extractQuestions(transcript: string): string[] {
    const parts = transcript
      .split(/[?\.!\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
    return parts.map((p) => {
      const q = p.endsWith("?") ? p : p + "?";
      return q.charAt(0).toUpperCase() + q.slice(1);
    });
  }

  private async createSurvey() {
    this.step = "creating";
    this.setStatus("creating");

    try {
      const surveyData = await llm.analyzeJSON<{ title: string; description: string }>(
        "Generate a short survey title (max 100 chars) and brief description (max 300 chars) from this product info. Respond with JSON only: " +
        JSON.stringify({ title: "", description: "" }),
        this.productInfo,
      );

      const slug = surveyData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

      const formattedQuestions = this.questions.map((q, i) => ({
        id: `q${i + 1}`,
        text: q,
        category: i === 0 ? "opening" : i === this.questions.length - 1 ? "closing" : "feedback",
      }));

      const survey = await prisma.survey.create({
        data: {
          orgId: this.orgId,
          title: surveyData.title,
          description: surveyData.description,
          slug,
          questions: formattedQuestions as any,
          status: "DRAFT",
        },
      });

      const link = `/s/${survey.slug}`;
      this.send({
        type: "agent_speak",
        text: `Survey created! Title: ${surveyData.title}. Link: ${link}. You can share this with your respondents.`,
      });
      this.send({
        type: "survey_created",
        surveyId: survey.id,
        slug: survey.slug,
        title: surveyData.title,
        link,
      });

      this.step = "done";
      this.setStatus("done");
    } catch (err) {
      this.send({ type: "error", message: (err as Error).message });
      this.setStatus("listening");
    }
  }
}

const adminSessions = new Map<string, AdminCreationSession>();

export function handleAdminMessage(ws: WebSocket, sessionId: string, orgId: string, data: Buffer) {
  let msg: { type: string; audio?: string };
  try {
    msg = JSON.parse(data.toString());
  } catch {
    ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    return;
  }

  if (msg.type === "start") {
    if (adminSessions.has(sessionId)) return;
    const session = new AdminCreationSession(ws, sessionId, orgId);
    adminSessions.set(sessionId, session);
    session.start();
    return;
  }

  if (msg.type === "audio" && msg.audio) {
    const session = adminSessions.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
      return;
    }
    session.handleAudio(Buffer.from(msg.audio, "base64"));
    return;
  }
}

export function cleanupAdminSession(sessionId: string) {
  adminSessions.delete(sessionId);
}
