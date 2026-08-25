import "dotenv/config";
import { isOpenAIConfigured, openAIAnalyzeJSON } from "./openai";
import { isGroqConfigured, groqAnalyzeJSON } from "./groq";

const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_API || "";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MODEL = "mistralai/mistral-small-24b-instruct-2501";

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export interface OpenAIInsight {
  summary: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
}

async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetchWithTimeout(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
    }),
  });

  if (res.status === 429) {
    throw new Error("OpenRouter rate limited");
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const choices = data?.choices as Array<Record<string, unknown>> | undefined;
  const content = choices?.[0]?.message as Record<string, unknown> | undefined;
  if (typeof content?.content !== "string") {
    throw new Error("Unexpected OpenRouter response shape");
  }
  return content.content;
}

async function analyzeJSON<T>(systemPrompt: string, userContent: string): Promise<T> {
  const raw = await chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/gi, "").replace(/\s*```\s*$/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseErr) {
    throw new Error(`Failed to parse AI response as JSON: ${(parseErr as Error).message}\nRaw: ${raw.slice(0, 500)}`);
  }
}

async function analyzeWithFallback<T>(
  systemPrompt: string,
  userContent: string,
): Promise<T> {
  if (OPENROUTER_API_KEY) {
    try {
      return await analyzeJSON<T>(systemPrompt, userContent);
    } catch (openRouterErr) {
      console.warn("OpenRouter failed, trying Groq:", (openRouterErr as Error).message);
    }
  }

  if (isGroqConfigured()) {
    try {
      return await groqAnalyzeJSON<T>(systemPrompt, userContent);
    } catch (groqErr) {
      console.error("Groq failed, trying OpenAI:", (groqErr as Error).message);
    }
  }

  if (isOpenAIConfigured()) {
    try {
      return await openAIAnalyzeJSON<T>(systemPrompt, userContent);
    } catch (openAIErr) {
      console.error("OpenAI also failed:", (openAIErr as Error).message);
    }
  }

  throw new Error("All LLM APIs exhausted");
}

export const openrouter = {
  analyzeJSON,
  analyzeWithFallback,
};