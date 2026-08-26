import WebSocket from "ws";
import "dotenv/config";

// ─── Key pools ────────────────────────────────────────────────────────────────

function getSttKeys(): string[] {
  return [
    process.env.SARVAM_KEY_1!,
    process.env.SARVAM_KEY_2!,
    process.env.SARVAM_KEY_3!,
    process.env.SARVAM_KEY_4!,
  ].filter(Boolean);
}

function getTtsKeys(): string[] {
  return [
    process.env.SARVAM_KEY_5!,
    process.env.SARVAM_KEY_6!,
    process.env.SARVAM_KEY_7!,
    process.env.SARVAM_KEY_8!,
  ].filter(Boolean);
}

const STT_KEYS = getSttKeys();
const TTS_KEYS = getTtsKeys();

if (STT_KEYS.length === 0) {
  console.warn("WARNING: No STT SARVAM_KEY_1-4 environment variables found");
}
if (TTS_KEYS.length === 0) {
  console.warn("WARNING: No TTS SARVAM_KEY_5-8 environment variables found");
}

// Per-service counters so each service cycles keys independently.
const counters: Record<string, number> = {
  stt:      0,
  tts:      0,
  realtime: 0,
};

export function getKey(service: keyof typeof counters): string {
  const keys = service === "tts" ? TTS_KEYS : STT_KEYS;
  if (keys.length === 0) {
    throw new Error(`No Sarvam API keys available for service: ${service}`);
  }
  const idx = counters[service] % keys.length;
  counters[service]++;
  return keys[idx];
}


// ─── STT — REST (keep for async analysis pipeline in pg-boss) ────────────────

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const key = getKey("stt");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" }),
    "audio.wav"
  );
  form.append("model",         "saaras:v3");
  form.append("language_code", "en-IN");
  form.append("mode",          "transcribe");

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method:  "POST",
    headers: { "API-SUBSCRIPTION-KEY": key },
    body:    form,
  });

  if (!res.ok) {
    throw new Error(`Sarvam STT error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { transcript?: string };
  return data.transcript ?? "";
}


// ─── Realtime STT — WebSocket (use this for live conversation turns) ─────────

export interface RealtimeSTTHandlers {
  onPartial:  (text: string) => void;
  onFinal:    (text: string) => void;
  onError:    (err: Error)   => void;
  onClose:    ()             => void;
}

export function createRealtimeSTT(
  handlers: RealtimeSTTHandlers,
  options: { languageCode?: string } = {}
): WebSocket {
  const key = getKey("realtime");

  const ws = new WebSocket(
    "wss://api.sarvam.ai/v1/speech-to-text/ws",
    {
      headers: {
        "API-SUBSCRIPTION-KEY": key,
      },
    }
  );

  ws.once("open", () => {
    ws.send(
      JSON.stringify({
        type:          "config",
        model:         "saaras:v3-realtime",
        language_code: options.languageCode ?? "en-IN",
        stream_type:   "vad",
        mode:          "transcribe",
        silence_duration_ms:    600,
        min_speech_duration_ms: 150,
      })
    );
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "transcript" && msg.transcript) {
        handlers.onPartial(msg.transcript);
      }

      if (msg.type === "final_transcript" && msg.transcript) {
        handlers.onFinal(msg.transcript);
      }
    } catch {
      // non-JSON ping/control frames — ignore
    }
  });

  ws.on("error", (err) => handlers.onError(err));
  ws.on("close", () => handlers.onClose());

  return ws;
}

export function sendAudioChunk(ws: WebSocket, pcm16Buffer: Buffer): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(pcm16Buffer);
  }
}


// ─── TTS — Bulbul v3 ─────────────────────────────────────────────────────────

export type BulbulSpeaker =
  | "anushka"
  | "abhilash"
  | "manisha"
  | "vidya"
  | "arya"
  | "karun"
  | "hitesh"
  | "aditya"
  | "ritu"
  | "priya"
  | "neha"
  | "rahul"
  | "pooja"
  | "rohan"
  | "simran"
  | "kavya"
  | "amit"
  | "dev"
  | "ishita"
  | "shreya"
  | "ratan"
  | "varun"
  | "manan"
  | "sumit"
  | "roopa"
  | "kabir"
  | "aayan"
  | "shubh"
  | "ashutosh"
  | "advait"
  | "anand"
  | "tanya"
  | "tarun"
  | "sunny"
  | "mani"
  | "gokul"
  | "vijay"
  | "shruti"
  | "suhani"
  | "mohit"
  | "kavitha"
  | "rehan"
  | "soham"
  | "rupali";

export async function synthesizeSpeech(
  text: string,
  options: {
    speaker?:       BulbulSpeaker;
    languageCode?:  string;
    pace?:          number;
  } = {}
): Promise<Buffer> {
  const key = getKey("tts");

  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method:  "POST",
    headers: {
      "API-SUBSCRIPTION-KEY": key,
      "Content-Type":         "application/json",
    },
    body: JSON.stringify({
      inputs:               [text],
      target_language_code: options.languageCode ?? "en-IN",
      speaker:              options.speaker       ?? "aditya",
      model:                "bulbul:v3",
      pace:                 options.pace          ?? 1.1,
      speech_sample_rate:   22050,
      enable_preprocessing: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sarvam TTS error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { audios?: string[] };

  // Sarvam returns base64-encoded WAV
  return Buffer.from(data.audios?.[0] ?? "", "base64");
}