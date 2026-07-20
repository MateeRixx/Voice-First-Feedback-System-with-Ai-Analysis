import "dotenv/config";

const API_KEY = process.env.OPEN_ROUTER_API || "";
const BASE = "https://openrouter.ai/api/v1";
const MODEL = "openrouter/free";

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

async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetchWithTimeout(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
    }),
  });

  if (res.status === 429) {
    throw new Error("OpenRouter rate limited — try again in a few seconds");
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const choices = data?.choices as Array<Record<string, unknown>> | undefined;
  const content = choices?.[0]?.message as Record<string, unknown> | undefined;
  if (typeof content?.content !== "string") {
    throw new Error("Unexpected OpenRouter response shape: choices missing or content not a string");
  }
  return content.content;
}

async function analyzeJSON<T>(systemPrompt: string, userContent: string): Promise<T> {
  const raw = await chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);

  let cleaned = raw.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/gi, "").replace(/\s*```\s*$/gi, "").trim();
  // Strip any leading/trailing non-JSON characters
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

export const openrouter = {
  chat,
  analyzeJSON,
};
