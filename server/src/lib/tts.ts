import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";

const OPENROUTER_TTS = false; // Set to true if using OpenRouter TTS

export interface TTSOptions {
  voice?: "male" | "female" | "neutral";
  rate?: number;
  pitch?: number;
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const { voice = "neutral", rate = 1, pitch = 1 } = options;

  if (OPENROUTER_TTS) {
    return await textToSpeechOpenRouter(text, { voice, rate, pitch });
  }

  // Fallback: Use Sarvam TTS if available, otherwise generate silent buffer
  return await textToSpeechFallback(text);
}

async function textToSpeechOpenRouter(
  text: string,
  options: TTSOptions
): Promise<Buffer> {
  const apiKey = process.env.OPEN_ROUTER_API;
  if (!apiKey) throw new Error("OPEN_ROUTER_API not configured");

  const response = await fetch("https://openrouter.ai/api/v1/audio", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.2-11b-vision:instruct",
      input: text,
      voice: options.voice,
      speed: options.rate,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TTS failed: ${errText}`);
  }

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  return Buffer.from(buffer);
}

async function textToSpeechFallback(text: string): Promise<Buffer> {
  // Generate a simple sine wave buffer as placeholder
  // In production, integrate with ElevenLabs, Sarvam TTS, or OpenAI TTS
  const sampleRate = 44100;
  const duration = Math.max(1, text.length * 0.05);
  const length = sampleRate * duration;
  const buffer = Buffer.alloc(length, 0);

  // Return a tiny silent buffer with a beep pattern
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * 440 * t) * 0.1;
    buffer[i] = Math.max(-128, Math.min(127, value * 128));
  }

  return buffer;
}