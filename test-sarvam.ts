import { SarvamAIClient } from "sarvamai"

const API_KEY = "sk_1a3rnmkt_XGNy3dO35pCeeP6kE8fzTaXg"

const client = new SarvamAIClient({ apiSubscriptionKey: API_KEY })

async function main() {
  console.log("=== Sarvam AI Test ===\n")

  // 1. Test Chat Completions (replaces Claude for insights)
  console.log("1. Testing Chat Completions...")
  try {
    const chat = await client.chat.completions({
      model: "sarvam-105b",
      messages: [
        {
          role: "system",
          content: "You analyze feedback. Respond in JSON with: summary, sentiment (POSITIVE|NEGATIVE|NEUTRAL|MIXED), urgency (HIGH|MEDIUM|LOW), tags (array of strings).",
        },
        {
          role: "user",
          content: "The product is okay but the delivery was late and customer support was rude.",
        },
      ],
    })
    console.log("Chat response:", JSON.stringify(chat, null, 2))
  } catch (err) {
    console.error("Chat error:", (err as Error).message)
  }

  console.log()

  // 2. Test Speech-to-Text (transcribe a sample audio)
  console.log("2. Testing Speech-to-Text (transcribe)...")
  try {
    // Use a small sample audio file — create a silent wav for testing
    const samplePath = await createSampleAudio()
    const stt = await client.speechToText.transcribe({
      file: samplePath,
    })
    console.log("Transcription:", JSON.stringify(stt, null, 2))
  } catch (err) {
    console.error("STT error:", (err as Error).message)
  }

  console.log()

  // 3. Test Text-to-Speech
  console.log("3. Testing Text-to-Speech...")
  try {
    const tts = await client.textToSpeech.convert({
      text: "This is a test feedback response",
      target_language_code: "en-IN",
    })
    console.log("TTS response (first 100 chars):", JSON.stringify(tts).slice(0, 100) + "...")
  } catch (err) {
    console.error("TTS error:", (err as Error).message)
  }

  console.log("\n=== Done ===")
}

async function createSampleAudio(): Promise<string> {
  const fs = await import("fs/promises")
  const path = await import("path")

  // Create a minimal WAV header (silence, 1 second, 8kHz mono)
  const sampleRate = 8000
  const numSamples = sampleRate * 1 // 1 second
  const dataSize = numSamples * 1 // 8-bit mono
  const headerSize = 44
  const buffer = Buffer.alloc(headerSize + dataSize)

  // WAV header
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 1, 28) // byte rate
  buffer.writeUInt16LE(1, 32) // block align
  buffer.writeUInt16LE(8, 34) // bits per sample
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)
  // Data is already zeroes (silence)

  const filePath = path.join(process.cwd(), "test-sample.wav")
  await fs.writeFile(filePath, buffer)
  return filePath
}

main()
