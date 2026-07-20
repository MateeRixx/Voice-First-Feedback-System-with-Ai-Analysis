import "dotenv/config";
import { prisma } from "./prisma";
import { openrouter } from "./openrouter";

export async function analyzeSurvey(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { title: true, description: true, _count: { select: { responses: true } } },
  });

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId, status: "PROCESSED" },
    include: { transcript: true, insight: true },
    orderBy: { createdAt: "asc" },
  });

  if (responses.length === 0) {
    return {
      totalResponses: 0,
      summary: "No processed responses yet.",
      sentimentBreakdown: {},
      topTags: [],
      commonThemes: [],
      recommendations: [],
    };
  }

  const rawTranscripts = responses
    .map((r, i) => `[Response ${i + 1}] ${r.transcript?.text ?? "(no transcript)"}`)
    .join("\n\n");

  const insightsSummary = responses
    .map((r, i) => `[Response ${i + 1}] Sentiment: ${r.insight?.sentiment ?? "?"} | Urgency: ${r.insight?.urgency ?? "?"} | Tags: ${(r.insight?.tags ?? []).join(", ")} | Summary: ${r.insight?.summary ?? "(no insight)"}`)
    .join("\n");

  const systemPrompt = [
    `You are analyzing responses for the survey: "${survey?.title ?? "Untitled"}"`,
    survey?.description ? `Survey context: ${survey.description}` : "",
    "",
    "You MUST return valid JSON. No markdown, no code fences, no extra text.",
    "",
    "Analyze all responses and return this exact JSON structure:",
    JSON.stringify({
      summary: "3-4 sentence executive summary: what are the key findings overall? Include specific percentages (e.g. '4 of 10 respondents mentioned...')",
      sentimentBreakdown: { "POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0, "MIXED": 0 },
      topTags: ["tag1", "tag2"],
      commonThemes: [
        { "theme": "Brief theme description", "frequency": "X of Y respondents", "sentiment": "mostly positive" }
      ],
      recommendations: [
        { "priority": "critical|high|medium|low", "action": "Specific actionable recommendation", "impact": "Expected business impact if implemented" }
      ],
    }, null, 2),
  ].filter(Boolean).join("\n");

  const userContent = [
    "Here are the raw transcripts (read each one carefully):",
    "",
    rawTranscripts,
    "",
    "And the per-response analysis summary:",
    insightsSummary,
    "",
    "Now analyze and return the JSON.",
  ].join("\n");

  const result = await openrouter.analyzeJSON<{
    summary: string;
    sentimentBreakdown: Record<string, number>;
    topTags: string[];
    commonThemes: Array<{ theme: string; frequency: string; sentiment: string }>;
    recommendations: Array<{ priority: string; action: string; impact: string }>;
  }>(systemPrompt, userContent);

  return {
    totalResponses: responses.length,
    summary: result.summary ?? "",
    sentimentBreakdown: result.sentimentBreakdown ?? {},
    topTags: result.topTags ?? [],
    commonThemes: (result.commonThemes ?? []).map((t) => typeof t === "string" ? { theme: t, frequency: "", sentiment: "" } : t),
    recommendations: (result.recommendations ?? []).map((r) => typeof r === "string" ? { priority: "medium", action: r, impact: "" } : r),
  };
}
