import { useEffect, useState } from "react";
import { useConversation } from "@/hooks/useConversation";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Bot, AlertCircle, CheckCircle2, Volume2, VolumeX } from "lucide-react";

interface ConversationAgentProps {
  sessionId: string;
  onDone?: (insight: { summary: string; sentiment: string; urgency: string; tags: string[] }) => void;
}

function VoiceOrb({ isSpeaking, isListening, isThinking }: { isSpeaking: boolean; isListening: boolean; isThinking: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className={`absolute h-32 w-32 rounded-full transition-all duration-500 ${
        isSpeaking
          ? "bg-primary/20 animate-ping"
          : isListening
          ? "bg-emerald-500/20 animate-pulse"
          : isThinking
          ? "bg-amber-500/20 animate-pulse"
          : "bg-muted/50"
      }`} />
      <div className={`absolute h-24 w-24 rounded-full transition-all duration-300 ${
        isSpeaking
          ? "bg-primary/30"
          : isListening
          ? "bg-emerald-500/30"
          : isThinking
          ? "bg-amber-500/30"
          : "bg-muted/30"
      }`} />
      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${
        isSpeaking
          ? "bg-primary text-primary-foreground"
          : isListening
          ? "bg-emerald-500 text-white"
          : isThinking
          ? "bg-amber-500 text-white"
          : "bg-muted text-muted-foreground"
      }`}>
        {isSpeaking ? (
          <Volume2 className="h-7 w-7 animate-bounce" />
        ) : isListening ? (
          <Mic className="h-7 w-7 animate-pulse" />
        ) : isThinking ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <Bot className="h-7 w-7" />
        )}
      </div>
    </div>
  );
}

export default function ConversationAgent({ sessionId, onDone }: ConversationAgentProps) {
  const {
    status,
    messages,
    insight,
    isRecording,
    isSpeaking,
    error,
    userTranscript,
    connect,
    startRecording,
    stopRecording,
    stopSpeaking,
  } = useConversation(sessionId);

  const [lastAgentMessage, setLastAgentMessage] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState("");

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (status === "done" && insight && onDone) {
      onDone(insight);
    }
  }, [status, insight, onDone]);

  useEffect(() => {
    const agentMsgs = messages.filter(m => m.role === "agent");
    const userMsgs = messages.filter(m => m.role === "user");
    if (agentMsgs.length > 0) setLastAgentMessage(agentMsgs[agentMsgs.length - 1].text);
    if (userMsgs.length > 0) setLastUserMessage(userMsgs[userMsgs.length - 1].text);
  }, [messages]);

  const isListening = status === "listening" || (status === "welcome" && messages.length === 0);
  const isThinking = status === "transcribing" || status === "analyzing";
  const isActive = isSpeaking || isListening;
  
  const displayUserTranscript = userTranscript || lastUserMessage;

  const statusText = 
    status === "connecting" ? "Connecting..." :
    status === "welcome" ? "Starting..." :
    status === "asking" ? "Agent is speaking..." :
    status === "listening" ? "Your turn — speak now" :
    status === "transcribing" ? "Understanding..." :
    status === "analyzing" ? "Analyzing..." :
    status === "done" ? "Complete" : "Ready";

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 p-4">
      <VoiceOrb isSpeaking={isSpeaking} isListening={isListening} isThinking={isThinking} />

      <div className="text-center space-y-2 max-w-md">
        <p className="text-lg font-medium text-foreground">{statusText}</p>
        
        {lastAgentMessage && status !== "done" && (
          <p className="text-sm text-muted-foreground italic">"{lastAgentMessage}"</p>
        )}
        
        {displayUserTranscript && (
          <p className="text-sm text-primary/80">You: "{displayUserTranscript}"</p>
        )}

        {messages.length > 0 && status !== "done" && (
          <span className="text-xs text-muted-foreground">
            {messages.filter((m) => m.role === "user").length} / 5 responses
          </span>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive w-full max-w-md">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {insight && status === "done" && (
        <div className="mx-4 mb-3 rounded-lg border bg-card p-4 space-y-2 w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Analysis Complete
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.summary}</p>
          <div className="flex gap-2 flex-wrap justify-center">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
              insight.sentiment === "POSITIVE" ? "bg-emerald-500/10 text-emerald-600" :
              insight.sentiment === "NEGATIVE" ? "bg-red-500/10 text-red-600" :
              "bg-muted text-muted-foreground"
            }`}>
              {insight.sentiment}
            </span>
            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {insight.urgency}
            </span>
            {insight.tags.map((tag) => (
              <span key={tag} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {isSpeaking && (
          <Button
            variant="outline"
            size="lg"
            onClick={stopSpeaking}
            className="gap-2 rounded-full h-14 w-14 p-0"
          >
            <VolumeX className="h-5 w-5" />
          </Button>
        )}

        {status === "done" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Conversation complete
          </div>
        ) : isRecording ? (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="lg"
            className="gap-2 rounded-full h-14 w-14 p-0"
          >
            <Square className="h-5 w-5" />
          </Button>
        ) : isActive ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="gap-2 rounded-full h-14 w-14 p-0"
            disabled={isThinking}
          >
            {isThinking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}