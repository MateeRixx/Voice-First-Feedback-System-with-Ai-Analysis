import { useState, useRef, useCallback, useEffect } from "react";
import { useTTSQueue } from "./useTTSQueue";

export type AdminStatus =
  | "idle"
  | "connecting"
  | "speaking"
  | "listening"
  | "transcribing"
  | "creating"
  | "done"
  | "error";

export type AdminMessage =
  | { role: "agent"; text: string }
  | { role: "user"; text: string }
  | { role: "system"; text: string };

export type SurveyCreated = {
  surveyId: string;
  slug: string;
  title: string;
  link: string;
};

function getWsBase(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.port === "5173"
    ? `${window.location.hostname}:3000`
    : window.location.host;
  return `${proto}//${host}`;
}

function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/ogg;codecs=opus"];
  for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
  return "";
}

export function useAdminSession(sessionId: string, orgId: string) {
  const [status, setStatus] = useState<AdminStatus>("idle");
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [surveyCreated, setSurveyCreated] = useState<SurveyCreated | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mountedRef = useRef(false);
  const recordingActive = useRef(false);

  const handleQueueEmpty = useCallback(() => {
    setStatus("listening");
    startRecordingInternal();
  }, []);

  const tts = useTTSQueue(handleQueueEmpty);

  const startRecordingInternal = useCallback(async () => {
    if (recordingActive.current) return;
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(s, mimeType ? { mimeType } : {});
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorder.current = null;
        recordingActive.current = false;
        setIsRecording(false);

        const totalBytes = chunks.current.reduce((sum, c) => sum + c.size, 0);
        if (totalBytes < 100) return;

        setStatus("transcribing");
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "audio", audio: base64 }));
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(100);
      recordingActive.current = true;
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic access failed");
      recordingActive.current = false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state !== "inactive") {
      mediaRecorder.current?.stop();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (recordingActive.current) { stopRecording(); }
    else { startRecordingInternal(); }
  }, [startRecordingInternal, stopRecording]);

  // Connect — runs once
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const wsUrl = `${getWsBase()}/ws/survey-creation/${sessionId}/${orgId}`;
    console.log("[AdminHook] Connecting to:", wsUrl);
    setStatus("connecting");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[AdminHook] Connected!");
      ws.send(JSON.stringify({ type: "start" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "agent_speak":
            setMessages((prev) => [...prev, { role: "agent", text: msg.text }]);
            setStatus("speaking");
            tts.enqueue(msg.text, msg.streaming ? "high" : "normal");
            break;
          case "user_transcript":
            setMessages((prev) => [...prev, { role: "user", text: msg.text }]);
            break;
          case "status":
            setStatus((prev) => prev === "speaking" ? prev : msg.status);
            break;
          case "survey_created":
            setSurveyCreated({ surveyId: msg.surveyId, slug: msg.slug, title: msg.title, link: msg.link });
            break;
          case "error":
            setError(msg.message);
            setMessages((prev) => [...prev, { role: "system", text: `Error: ${msg.message}` }]);
            break;
        }
      } catch {}
    };

    ws.onerror = () => setError("WebSocket connection failed");
    ws.onclose = () => console.log("[AdminHook] Closed");

    return () => {
      mountedRef.current = false;
      tts.flush();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, orgId]); // eslint-disable-line

  return {
    status, messages, surveyCreated, isRecording, isSpeaking: tts.isSpeaking, error,
    startRecording: startRecordingInternal, stopRecording, toggleRecording,
    stopSpeaking: tts.flush,
  };
}
