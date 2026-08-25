import "dotenv/config";

const API_KEY = process.env.OPENAI_API || "";
const BASE = "https://api.openai.com/v1";

if (!API_KEY) {
  console.warn("⚠️ OPENAI_API not configured — OpenAI fallback disabled");
}

export interface TranscribeResult {
  transcript: string;
  language?: string;
  confidence?: number;
}

/** Whisper STT fallback */
export async function openAISTT(audioBuffer: Buffer): Promise<TranscribeResult> {
  if (!API_KEY) throw new Error("OpenAI API key not configured");

  const formData = new FormData();
  // Convert Buffer to Blob compatible format
  const blob = new Blob([audioBuffer] as any, { type: "audio/webm" });
  formData.append("file", blob, "recording.webm");
  formData.append("model", "whisper-1");

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI STT error: ${err}`);
  }

  return res.json() as Promise<TranscribeResult>;
}

/** Chat completion fallback for LLM analysis */
export interface OpenAIInsight {
  summary: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
}

/** Analyze feedback using OpenAI GPT-3.5-turbo or GPT-4o-mini */
export async function openAIAnalyzeJSON<T>(
  systemPrompt: string,
  userContent: string,
): Promise<T> {
  if (!API_KEY) throw new Error("OpenAI API key not configured");

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo", // Cheapest/fastest; change to "gpt-4o-mini" for higher quality
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${err}`);
  }

  const data = await res.json();
  // OpenAI response type
  const openAIResponse = data as { choices?: Array<{ message: { content: string } }> } || {};
  const content = openAIResponse.choices?.[0]?.message?.content || "";

  // Strip markdown code fences if model outputs them
  let cleaned = content.trim().replace(/^```(?:json)?\s*/gi, "").replace(/\s*```\s*$/gi, "").trim();

  // Extract JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseErr) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${(parseErr as Error).message}\nRaw: ${content.slice(0, 500)}`);
  }
}

/** Check if OpenAI is available */
export function isOpenAIConfigured(): boolean {
  return !!API_KEY;
}