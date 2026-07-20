import "dotenv/config";
import fs from "fs";
import { SarvamAIClient } from "sarvamai";

const raw = process.env.SARVAM_API || "";
const keys = raw.split(",").map((k) => k.trim()).filter(Boolean);

const clients: SarvamAIClient[] = keys.map(
  (k) => new SarvamAIClient({ apiSubscriptionKey: k })
);

const failed = new Set<SarvamAIClient>();
let counter = 0;

function getClient(): SarvamAIClient | null {
  for (let i = 0; i < clients.length; i++) {
    const idx = (counter + i) % clients.length;
    const client = clients[idx];
    if (!failed.has(client)) {
      counter = (idx + 1) % clients.length;
      return client;
    }
  }
  return null;
}

function markFailed(client: SarvamAIClient) {
  failed.add(client);
}

function isQuotaError(err: unknown): boolean {
  const code = (err as { statusCode?: number })?.statusCode ?? (err as { status?: number })?.status;
  if (code === 429 || code === 403) return true;
  const msg = String((err as Error)?.message ?? "");
  return msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota") || msg.includes("Forbidden");
}

export interface TranscribeResult {
  transcript: string
  language?: string
  confidence?: number
}

async function transcribe(audioPath: string): Promise<TranscribeResult> {
  while (true) {
    const client = getClient();
    if (!client) break;
    try {
      const stream = fs.createReadStream(audioPath);
      const res = await client.speechToText.transcribe({
        file: stream,
      });
      const r = res as unknown as Record<string, unknown>;
      if (typeof r?.transcript !== "string") {
        throw new Error("Sarvam API response missing transcript field");
      }
      return {
        transcript: r.transcript,
        language: typeof r.language_code === "string" ? r.language_code : typeof r.language === "string" ? r.language : undefined,
      };
    } catch (err) {
      if (isQuotaError(err)) {
        markFailed(client);
        continue;
      }
      throw err;
    }
  }
  throw new Error("All Sarvam API keys exhausted");
}

export const sarvam = { transcribe };