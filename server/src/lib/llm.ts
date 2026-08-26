import "dotenv/config";

const GROQ_API_KEY = process.env.GROQ_API || "";
const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_API || "";
const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

// Primary: Groq (fastest TTFT), Fallback: OpenRouter
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const OPENROUTER_MODEL = "mistralai/mistral-small-24b-instruct-2501";

// ─── Sentence boundary for streaming chunking ───
const SENTENCE_RE = /[.!?]["'\u201d]?\s/g;

// ─── Non-streaming chat (for JSON analysis) ───
async function groqChat(messages: { role: string; content: string }[]): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Groq not configured");
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.3, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content || "";
}

async function openrouterChat(messages: { role: string; content: string }[]): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter not configured");
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, temperature: 0.3, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content || "";
}

// ─── Streaming chat generator ───
async function* groqStreamChat(messages: { role: string; content: string }[]): AsyncGenerator<string> {
  if (!GROQ_API_KEY) throw new Error("Groq not configured");
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.3, max_tokens: 512, stream: true }),
  });
  if (!res.ok) throw new Error(`Groq stream ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload);
        const token = parsed.choices?.[0]?.delta?.content;
        if (typeof token === "string" && token) yield token;
      } catch {}
    }
  }
}

async function* openrouterStreamChat(messages: { role: string; content: string }[]): AsyncGenerator<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter not configured");
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, temperature: 0.3, max_tokens: 512, stream: true }),
  });
  if (!res.ok) throw new Error(`OpenRouter stream ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload);
        const token = parsed.choices?.[0]?.delta?.content;
        if (typeof token === "string" && token) yield token;
      } catch {}
    }
  }
}

// ─── Public: Non-streaming (for JSON analysis) ───
export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  if (GROQ_API_KEY) {
    try { return await groqChat(messages); } catch (e) {
      console.warn("Groq chat failed, trying OpenRouter:", (e as Error).message);
    }
  }
  if (OPENROUTER_API_KEY) {
    try { return await openrouterChat(messages); } catch (e) {
      console.error("OpenRouter chat failed:", (e as Error).message);
    }
  }
  throw new Error("All LLM APIs exhausted");
}

// ─── Public: Streaming (primary Groq, fallback OpenRouter) ───
export async function* streamChat(messages: { role: string; content: string }[]): AsyncGenerator<string> {
  if (GROQ_API_KEY) {
    try {
      yield* groqStreamChat(messages);
      return;
    } catch (e) {
      console.warn("Groq stream failed, trying OpenRouter:", (e as Error).message);
    }
  }
  if (OPENROUTER_API_KEY) {
    try {
      yield* openrouterStreamChat(messages);
      return;
    } catch (e) {
      console.error("OpenRouter stream failed:", (e as Error).message);
    }
  }
  throw new Error("All LLM APIs exhausted");
}

// ─── Sentence chunker: yields complete sentences from token stream ───
export async function* sentenceChunker(tokenStream: AsyncGenerator<string>): AsyncGenerator<string> {
  let buffer = "";
  for await (const token of tokenStream) {
    buffer += token;
    let match;
    while ((match = SENTENCE_RE.exec(buffer)) !== null) {
      const end = match.index + match[0].length;
      yield buffer.slice(0, end);
      buffer = buffer.slice(end);
      SENTENCE_RE.lastIndex = 0;
    }
  }
  if (buffer.trim()) yield buffer.trim();
}

// ─── Public: JSON analysis with fallback ───
export async function analyzeJSON<T>(systemPrompt: string, userContent: string): Promise<T> {
  const raw = await chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);

  let cleaned = raw.trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/gi, "")
    .replace(/\s*```\s*$/gi, "")
    .trim();
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

// ─── Backward compat ───
export const openrouter = { analyzeJSON };
export const llm = { chat, streamChat, sentenceChunker, analyzeJSON };
