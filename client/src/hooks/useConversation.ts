import { useState, useRef, useCallback, useEffect } from "react";

export type ConversationStatus =
  | "idle"
  | "connecting"
  | "welcome"
  | "asking"
  | "listening"
  | "transcribing"
  | "analyzing"
  | "done";

export type ChatMessage =
  | { role: "agent"; text: string }
  | { role: "user"; text: string }
  | { role: "system"; text: string };

export type AIInsight = {
  summary: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
};

function getWsBase(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.port === "5173"
    ? `${window.location.hostname}:3000`
    : window.location.host;
  return `${proto}//${host}`;
}

interface TTSQueueItem {
  text: string;
  priority?: "high" | "normal";
}

function useTTSQueue(onQueueEmpty?: () => void) {
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

function float32ToPCM16(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useConversation(sessionId: string) {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const micStreamCleanupRef = useRef<(() => void) | null>(null);

  const handleQueueEmpty = useCallback(() => {
    if (status === "asking" || status === "welcome") {
      setStatus("listening");
      startMicStream();
    }
  }, [status]);

  const tts = useTTSQueue(handleQueueEmpty);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const startMicStream = useCallback(async () => {
    if (micStreamCleanupRef.current) {
      micStreamCleanupRef.current();
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const ws = wsRef.current;
        if (ws?.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(float32);
        const b64 = arrayBufferToBase64(pcm16);
        ws.send(JSON.stringify({ type: "audio_chunk", data: b64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      micStreamCleanupRef.current = () => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
      };

      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mic access failed";
      setError(msg);
      setIsRecording(false);
    }
  }, []);

  const stopMicStream = useCallback(() => {
    if (micStreamCleanupRef.current) {
      micStreamCleanupRef.current();
      micStreamCleanupRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    setStatus("connecting");
    const ws = new WebSocket(`${getWsBase()}/ws/conversation/${sessionId}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "session_init", sessionId, surveyId: window.__SURVEY_ID__ }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "agent_speak":
            addMessage({ role: "agent", text: msg.text });
            setStatus("asking");
            tts.enqueue(msg.text, msg.streaming ? "high" : "normal");
            break;
          case "user_transcript":
            addMessage({ role: "user", text: msg.text });
            setUserTranscript("");
            break;
          case "user_partial":
            setUserTranscript(msg.text);
            break;
          case "token":
            addMessage({ role: "agent", text: msg.text });
            break;
          case "audio":
            if (msg.data) {
              const audio = new Audio(`data:audio/wav;base64,${msg.data}`);
              audio.play().catch(() => {});
            }
            break;
          case "tts_chunk":
            tts.enqueue(msg.text, "high");
            break;
          case "status":
            setStatus(msg.status);
            break;
          case "agent_thinking":
            setStatus("transcribing");
            break;
          case "turn_complete":
            setStatus("listening");
            startMicStream();
            break;
          case "analysis":
            setInsight(msg.insight);
            break;
          case "error":
            setError(msg.message);
            addMessage({ role: "system", text: `Error: ${msg.message}` });
            break;
        }
      } catch {}
    };

    ws.onerror = () => setError("WebSocket connection failed");
    ws.onclose = () => {
      if (status !== "done") setStatus("idle");
      stopMicStream();
    };

    wsRef.current = ws;
  }, [sessionId, addMessage, status, tts, stopMicStream]);

  const cleanup = useCallback(() => {
    mountedRef.current = false;
    tts.flush();
    stopMicStream();
    wsRef.current?.close();
  }, [tts, stopMicStream]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    messages,
    insight,
    isRecording,
    isSpeaking: tts.isSpeaking,
    error,
    userTranscript,
    connect,
    startRecording: startMicStream,
    stopRecording: stopMicStream,
    stopSpeaking: tts.flush,
  };
}