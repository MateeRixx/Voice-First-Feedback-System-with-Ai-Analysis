import { synthesizeSpeech, BulbulSpeaker } from "./sarvam";

export async function synthesize(
  text: string,
  speaker: BulbulSpeaker = "aditya"
): Promise<string> {
  const wav = await synthesizeSpeech(text, { speaker });
  return wav.toString("base64");
}

export async function synthesizeToBuffer(
  text: string,
  speaker: BulbulSpeaker = "aditya"
): Promise<Buffer> {
  return synthesizeSpeech(text, { speaker });
}