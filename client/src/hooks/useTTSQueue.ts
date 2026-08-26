import { useRef, useCallback, useState } from "react";

interface TTSQueueItem {
  text: string;
  priority?: "high" | "normal";
}

export function useTTSQueue(onQueueEmpty?: () => void) {
  const queue = useRef<TTSQueueItem[]>([]);
  const playing = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const playNext = useCallback(() => {
    if (queue.current.length === 0) {
      playing.current = false;
      setIsSpeaking(false);
      onQueueEmpty?.();
      return;
    }

    playing.current = true;
    setIsSpeaking(true);
    const item = queue.current.shift()!;

    if (!window.speechSynthesis) {
      playNext();
      return;
    }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(item.text);
    u.rate = 0.95;
    u.pitch = 1.0;
    u.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha"))) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    if (v) u.voice = v;

    u.onend = () => playNext();
    u.onerror = () => playNext();

    window.speechSynthesis.speak(u);
  }, [onQueueEmpty]);

  const enqueue = useCallback((text: string, priority: "high" | "normal" = "normal") => {
    if (!text.trim()) return;
    queue.current.push({ text, priority });
    if (!playing.current) {
      playNext();
    }
  }, [playNext]);

  const flush = useCallback(() => {
    queue.current = [];
    window.speechSynthesis?.cancel();
    playing.current = false;
    setIsSpeaking(false);
  }, []);

  return { enqueue, flush, isSpeaking };
}
