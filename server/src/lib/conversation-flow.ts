import "dotenv/config";
import { transcribeAudio } from "./sarvam";
import { openrouter } from "./openrouter";
import type { AIInsight } from "./process-response";

export type Question = {
  id: string;
  text: string;
  category: "opening" | "feedback" | "clarification" | "closing";
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

export class ConversationFlow {
  private state: ConversationState;
  private questionQueue: Question[];
  private onResponse: (response: string) => void;
  private onAgentSpeak: (text: string) => void;
  private onStatusChange: (state: ConversationState) => void;

  constructor(
    onResponse: (response: string) => void,
    onAgentSpeak: (text: string) => void,
    onStatusChange: (state: ConversationState) => void,
    customQuestions?: Question[],
  ) {
    this.onResponse = onResponse;
    this.onAgentSpeak = onAgentSpeak;
    this.onStatusChange = onStatusChange;
    this.questionQueue = customQuestions || DEFAULT_QUESTIONS;
    this.state = {
      status: "welcome",
      currentQuestionIndex: 0,
      responses: {},
      transcript: "",
      startedAt: new Date(),
    };
  }

  get currentState(): ConversationState {
    return { ...this.state };
  }

  get currentQuestion(): Question | undefined {
    return this.questionQueue[this.state.currentQuestionIndex];
  }

  get isDone(): boolean {
    return this.state.status === "done" || this.state.currentQuestionIndex >= this.questionQueue.length;
  }

  async start(): Promise<void> {
    this.state.status = "welcome";
    this.onStatusChange(this.state);
    await this.speakWelcome();
  }

  private async speakWelcome(): Promise<void> {
    const welcomeText = "Hello! Thanks for joining. I'm your voice feedback assistant. I'll ask you a few questions about your experience, and then give you some personalized feedback. Are you ready to get started?";
    this.onAgentSpeak(welcomeText);
    this.state.status = "active";
    this.onStatusChange(this.state);
  }

  async nextQuestion(): Promise<void> {
    if (this.isDone) return;

    const question = this.currentQuestion;
    if (!question) return;

    this.state.currentQuestionIndex++;
    this.state.responses[question.id] = "";
    this.state.transcript = "";

    this.onStatusChange({
      ...this.state,
      status: "collecting",
      currentQuestionIndex: this.state.currentQuestionIndex - 1,
    });

    await this.speakQuestion(question.text);
  }

  private async speakQuestion(text: string): Promise<void> {
    this.onAgentSpeak(text);
  }

  async processResponse(audioBlob: Blob): Promise<void> {
    // Transcribe using Sarvam
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const transcript = await transcribeAudio(buffer);

      this.state.transcript = transcript;
      this.onStatusChange({
        ...this.state,
        status: "collecting",
      });

      // Store response
      const currentQuestion = this.currentQuestion;
      if (currentQuestion) {
        this.state.responses[currentQuestion.id] = transcript;
      }

      // Analyze and ask next question or give feedback
      await this.handleResponse(transcript);
    } catch (err) {
      console.error("Transcription error:", err);
    }
  }

  private async handleResponse(transcript: string): Promise<void> {
    // Check if we should analyze or continue
    if (this.isDone || this.state.currentQuestionIndex >= this.questionQueue.length - 1) {
      await this.finishConversation();
    } else {
      await this.nextQuestion();
    }
  }

  private async finishConversation(): Promise<void> {
    this.state.status = "analyzing";
    this.onStatusChange(this.state);

    // Analyze all responses
    const allText = Object.values(this.state.responses)
      .filter((r: string) => r.trim())
      .join(" ");

    if (allText.trim()) {
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
        allText,
      );

      this.state.insights = insight;
      this.state.status = "feedback";
      this.onStatusChange(this.state);

      await this.speakFeedback(insight);
    } else {
      await this.speak("I didn't catch any responses. Let's try again sometime. Goodbye!");
      this.state.status = "done";
      this.onStatusChange(this.state);
    }
  }

  private async speakFeedback(insight: AIInsight): Promise<void> {
    const feedbackText = `
      Thanks for sharing your experience! Here's what I found:

      Key takeaway: ${insight.summary}

      Overall sentiment: ${insight.sentiment}. ${this.sentimentDescription(insight.sentiment)}

      I've tagged this as: ${insight.tags.join(", ")}.

      Is there anything else you'd like to mention before we finish?
    `.trim();

    this.onAgentSpeak(feedbackText);
    this.state.status = "feedback";
    this.onStatusChange(this.state);
  }

  private sentimentDescription(sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED"): string {
    const descriptions = {
      POSITIVE: "We really appreciate your kind words!",
      NEGATIVE: "We're sorry to hear that. Your feedback helps us improve.",
      NEUTRAL: "Thanks for the factual feedback.",
      MIXED: "You mentioned both positive and negative experiences.",
    };
    return descriptions[sentiment] || "";
  }

  async speak(text: string): Promise<void> {
    this.onAgentSpeak(text);
  }

  getResponses(): Record<string, string> {
    return { ...this.state.responses };
  }
}