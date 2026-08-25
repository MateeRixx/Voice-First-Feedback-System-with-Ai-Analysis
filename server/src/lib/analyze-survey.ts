import "dotenv/config";
import { prisma } from "./prisma";

export interface SurveyCSVRow {
  id: string;
  date: string;
  durationSec: number | null;
  sentiment: string;
  urgency: string;
  tags: string[];
  summary: string;
  transcript: string;
  audioUrl: string;
}

export async function analyzeSurvey(surveyId: string): Promise<SurveyCSVRow[]> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { title: true, _count: { select: { responses: true } } },
  });

  if (!survey) return [];

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId, status: "PROCESSED" },
    include: { transcript: true, insight: true, attachment: true },
    orderBy: { createdAt: "asc" },
  });

  return responses.map((r) => ({
    id: r.id,
    date: new Date(r.createdAt).toISOString(),
    durationSec: r.durationSec,
    sentiment: r.insight?.sentiment ?? "",
    urgency: r.insight?.urgency ?? "",
    tags: r.insight?.tags ?? [],
    summary: r.insight?.summary ?? "",
    transcript: r.transcript?.text ?? "",
    audioUrl: r.attachment?.r2Url ?? "",
  }));
}