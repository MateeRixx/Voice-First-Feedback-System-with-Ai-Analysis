import "dotenv/config";

const GROQ_API_KEY = process.env.GROQ_API || "";
const BASE = "https://api.groq.com/openai/v1";

if (!GROQ_API_KEY) {
  console.warn("⚠️ GROQ_API not configured — Groq fallback disabled");
}

/** Groq Llama 3 Insight Response */
export interface GroqInsight {
  summary: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
}

/** Analyze using Groq Llama 3.2 90B */
export async function groqAnalyzeJSON<T>(
  systemPrompt: string,
  userContent: string,
): Promise<T> {
  if (!GROQ_API_KEY) throw new Error("Groq API key not configured");

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3.6-27b",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data?.choices?.[0]?.message?.content || "";

  // Strip Qwen thinking tags and markdown code fences
  let cleaned = content.trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/gi, "")
    .replace(/\s*```\s*$/gi, "")
    .trim();

  // Extract JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseErr) {
    throw new Error(`Failed to parse Groq response as JSON: ${(parseErr as Error).message}\nRaw: ${content.slice(0, 500)}`);
  }
}

/** Check if Groq is configured */
export function isGroqConfigured(): boolean {
  return !!GROQ_API_KEY;
}