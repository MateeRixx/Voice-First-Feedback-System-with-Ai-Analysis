import "dotenv/config";
import { prisma } from "./prisma";
import { sarvam } from "./sarvam";
import { openrouter } from "./openrouter";
import { notifyResponseClients } from "./notify";
import fs from "fs";
import path from "path";
import os from "os";

const ALLOWED_HOSTS = [
  "res.cloudinary.com",
  "api.cloudinary.com",
]

async function downloadAudio(url: string, dest: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid audio URL");
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Download from ${parsed.hostname} is not allowed`);
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download audio: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

export async function processResponse(responseId: string): Promise<void> {
  const response = await prisma.surveyResponse.findUnique({
    where: { id: responseId },
    include: { attachment: true },
  });

  if (!response) throw new Error("Response not found");
  if (response.status !== "PENDING") throw new Error("Response already processed");

  notifyResponseClients(responseId, "processing");

  const isTextOnly = !response.attachment && !!response.textFeedback;

  let transcript: string;
  let language: string | null = null;

  if (isTextOnly) {
    transcript = response.textFeedback!;
  } else {
    if (!response.attachment) throw new Error("Response has no audio attachment or text feedback");
    notifyResponseClients(responseId, "transcribing");
    const tmpFile = path.join(os.tmpdir(), `truetone-${responseId}.webm`);
    try {
      await downloadAudio(response.attachment.r2Url, tmpFile);
      const result = await sarvam.transcribe(tmpFile);
      transcript = result.transcript;
      language = result.language ?? null;
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  }

  notifyResponseClients(responseId, "analyzing");

  const systemPrompt = [
    "You are a business feedback analyst. Analyze this voice transcript and return actionable insights.",
    "Rules:",
    "- Be specific and concrete. Avoid generic statements.",
    "- Identify the key issue or praise — what exactly is the person talking about?",
    "- Determine the emotional tone: POSITIVE (delighted/satisfied), NEGATIVE (frustrated/complaint), NEUTRAL (factual), or MIXED (both positive and negative).",
    "- Rate urgency based on business impact: HIGH (revenue/brand risk, needs immediate action), MEDIUM (important but not critical), LOW (minor feedback).",
    "- Tag the response with 1-4 specific keywords (e.g. \"pricing\", \"customer-support\", \"ui\", \"delivery\", \"quality\").",
    "Respond ONLY with valid JSON, no markdown, no code fences:",
    JSON.stringify({ summary: "1-2 sentence key takeaway", sentiment: "POSITIVE|NEGATIVE|NEUTRAL|MIXED", urgency: "HIGH|MEDIUM|LOW", tags: ["tag1", "tag2"] }),
  ].join("\n");

  const insight = await openrouter.analyzeJSON<{
    summary: string;
    sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
    urgency: "HIGH" | "MEDIUM" | "LOW";
    tags: string[];
  }>(systemPrompt, transcript);

  try {
    // Atomic claim — only succeeds if response is still PENDING
    const { count } = await prisma.surveyResponse.updateMany({
      where: { id: responseId, status: "PENDING" },
      data: { status: "PROCESSED" },
    });
    if (count === 0) throw new Error("Response already processed by another worker");

    await prisma.transcript.create({
      data: { responseId, text: transcript, language },
    });
    await prisma.aIInsight.create({
      data: {
        responseId,
        summary: insight.summary,
        sentiment: insight.sentiment,
        urgency: insight.urgency,
        tags: insight.tags,
        rawModelOutput: insight,
      },
    });

    notifyResponseClients(responseId, "done", {
      sentiment: insight.sentiment,
      urgency: insight.urgency,
    });
  } catch (err) {
    // Don't overwrite PROCESSED → FAILED in a race condition
    const current = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
      select: { status: true },
    });
    if (current && current.status !== "PROCESSED") {
      await prisma.surveyResponse.update({
        where: { id: responseId },
        data: { status: "FAILED" },
      });
    }
    notifyResponseClients(responseId, "failed", { error: (err as Error).message });
    throw err;
  }
}