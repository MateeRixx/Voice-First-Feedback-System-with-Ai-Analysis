import { sarvam } from "./sarvam";
import { openrouter } from "./openrouter";

export type Question = {
  id: string;
  text: string;
  category: "opening" | "feedback" | "clarification" | "closing";
};

export type AIInsight = {
  summary: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
};

export type ConversationState = {
  status: "welcome" | "active" | "collecting" | "analyzing" | "feedback" | "done";
  currentQuestionIndex: number;
  responses: Record<string, string>;
  transcript: string;
  insights?: AIInsight;
  startedAt: Date;
  finishedAt?: Date;
};

export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Hello! Thanks for joining. I'm your voice feedback assistant. To get started, could you tell me a bit about your recent experience with our service?",
    category: "opening",
  },
  {
    id: "q2",
    text: "What did you like most about your experience?",
    category: "feedback",
  },
  {
    id: "q3",
    text: "Was there anything that frustrated or could be improved?",
    category: "feedback",
  },
  {
    id: "q4",
    text: "How likely are you to recommend us to a friend or colleague?",
    category: "clarification",
  },
  {
    id: "q5",
    text: "Is there anything else you'd like to share?",
    category: "closing",
  },
];

export function useConversationFlow(
  mode: "single" | "conversational",
  onResponse: (response: string) => void,
  onAgentSpeak: (text: string) => void,
  onStatusChange: (state: ConversationState) => void,
) {
  const [state, setState] = (global as any).React ? global.React.useState : {
    status: "welcome",
    currentQuestionIndex: 0,
    responses: {},
    transcript: "",
    insights: undefined,
    startedAt: new Date(),
  };

  // Initialize state if first call
  if ((global as any).React === undefined) {
    setState({
      status: "welcome",
      currentQuestionIndex: 0,
      responses: {},
      transcript: "",
      insights: undefined,
      startedAt: new Date(),
    });
  }

  const currentQuestion = DEFAULT_QUESTIONS[state.currentQuestionIndex];
  const isDone = state.status === "done" || state.currentQuestionIndex >= DEFAULT_QUESTIONS.length;

  const start = () => {
    setState({
      status: "welcome",
      currentQuestionIndex: 0,
      responses: {},
      transcript: "",
      insights: undefined,
      startedAt: new Date(),
    });
    speakWelcome();
  };

  const speakWelcome = () => {
    const welcomeText = "Hello! Thanks for joining. I'm your voice feedback assistant. I'll ask you a few questions about your experience, and then give you some personalized feedback. Are you ready to get started?";
    onAgentSpeak(welcomeText);
    setState({
      ...state,
      status: "active",
    });
    onStatusChange({
      ...state,
      status: "active",
    });
  };

  const nextQuestion = () => {
    if (isDone) return;

    const question = DEFAULT_QUESTIONS[state.currentQuestionIndex];
    if (!question) return;

    setState({
      ...state,
      currentQuestionIndex: state.currentQuestionIndex + 1,
      responses: {
        ...state.responses,
        [question.id]: "",
      },
      transcript: "",
    });

    setTimeout(() => {
      speakQuestion(question.text);
    }, 500);
  };

  const speakQuestion = (text: string) => {
    onAgentSpeak(text);
    setState({
      ...state,
      status: "collecting",
    });
    onStatusChange({
      ...state,
      status: "collecting",
    });
  };

  const processResponse = async (transcript: string) => {
    setState({
      ...state,
      transcript,
    });

    setState({
      ...state,
      status: "collecting",
    });

    // Store response for current question
    const questionId = DEFAULT_QUESTIONS[state.currentQuestionIndex]?.id;
    if (questionId) {
      setState({
        ...state,
        responses: {
          ...state.responses,
          [questionId]: transcript,
        },
      });
    }

    // Handle response and move forward
    handleResponse(transcript);
  };

  const handleResponse = async (transcript: string) => {
    const allResponses = DEFAULT_QUESTIONS.map((q, i) => state.responses[q.id] || "").filter(Boolean).join(" ");

    if (isDone || state.currentQuestionIndex >= DEFAULT_QUESTIONS.length - 1) {
      finishConversation(allResponses);
    } else {
      nextQuestion();
    }
  };

  const finishConversation = async (allResponses: string) => {
    setState({
      ...state,
      status: "analyzing",
    });
    onStatusChange({
      ...state,
      status: "analyzing",
    });

    if (allResponses.trim()) {
      const insight = await openrouter.analyzeJSON<AIInsight>(
        [
          "You are a business feedback analyst. Analyze this user feedback and return:",
          "- A 2-3 sentence summary of the key takeaways",
          "- Sentiment: POSITIVE, NEGATIVE, or NEUTRAL",
          "- Urgency: HIGH, MEDIUM, or LOW",
          "- 3-5 specific tags (e.g., pricing, customer-support, ui, delivery, quality)",
          "- One concrete piece of feedback the user mentioned",
          "Respond with valid JSON only, no markdown, no code fences:",
          JSON.stringify({ summary: "", sentiment: "", urgency: "", tags: [] }),
        ].join("\n"),
        allResponses,
      );

      setState({
        ...state,
        insights: insight,
        status: "feedback",
      });
      onStatusChange({
        ...state,
        insights: insight,
        status: "feedback",
      });

      speakFeedback(insight);
    } else {
      speak("I didn't catch any responses. Let's try again sometime. Goodbye!");
      setState({
        ...state,
        status: "done",
      });
      onStatusChange({
        ...state,
        status: "done",
      });
    }
  };

  const speakFeedback = (insight: AIInsight) => {
    const feedbackText = `
      Thanks for sharing your experience! Here's what I found:

      Key takeaway: ${insight.summary}

      Overall sentiment: ${insight.sentiment}. ${getSentimentDescription(insight.sentiment)}

      I've tagged this as: ${insight.tags.join(", ")}.

      Is there anything else you'd like to mention before we finish?
    `.trim();

    onAgentSpeak(feedbackText);
    setState({
      ...state,
      status: "feedback",
    });
    onStatusChange({
      ...state,
      status: "feedback",
    });
  };

  const getSentimentDescription = (sentiment: string) => {
    const descriptions = {
      POSITIVE: "We really appreciate your kind words!",
      NEGATIVE: "We're sorry to hear that. Your feedback helps us improve.",
      NEUTRAL: "Thanks for the factual feedback.",
    };
    return descriptions[sentiment] || "";
  };

  const speak = (text: string) => {
    onAgentSpeak(text);
  };

  const getResponses = () => ({
    ...state.responses,
    transcript: state.transcript,
    insights: state.insights,
  });

  return {
    state,
    start,
    nextQuestion,
    processResponse,
    speak,
    getResponses,
    isDone,
    currentQuestion,
  };
}