import { z } from "zod"
import { prisma } from "../lib/prisma";
import { enqueueProcessResponse } from "../lib/job-queue";
import { analyzeSurvey } from "../lib/analyze-survey";
import { assertAuth } from "../middleware/auth";
import type { Request, Response } from "express";

const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  caption: z.string().optional(),
});

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  category: z.enum(["opening", "feedback", "clarification", "closing"]),
});

const createSurveySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  questions: z.array(questionSchema).min(1, "At least one question required").max(10).optional(),
  voiceDurationLimitSec: z.number().int().min(10).max(300).optional(),
  textFeedbackEnabled: z.boolean().optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  media: z.array(mediaItemSchema).max(20).optional(),
});

export async function list(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const surveys = await prisma.survey.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
    res.json({ surveys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch surveys" });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, orgId },
      include: { _count: { select: { responses: true } } },
    });
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    res.json({ survey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch survey" });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);

    const parsed = createSurveySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((e) => e.message).join(", ") });
    }

    const { title, subtitle, description, questions, voiceDurationLimitSec, textFeedbackEnabled, theme, media } = parsed.data;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

    const survey = await prisma.survey.create({
      data: {
        orgId,
        title,
        subtitle: subtitle || null,
        description: description || null,
        slug,
        questions: questions as any,
        voiceDurationLimitSec: voiceDurationLimitSec || 120,
        textFeedbackEnabled: textFeedbackEnabled ?? false,
        theme: theme as object | undefined,
        media: media as object | undefined,
      },
    });

    res.status(201).json({ survey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create survey" });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const { title, subtitle, description, voiceDurationLimitSec, textFeedbackEnabled, theme, media } = req.body;

    const existing = await prisma.survey.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "Survey not found" });

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(description !== undefined && { description }),
        ...(voiceDurationLimitSec !== undefined && { voiceDurationLimitSec }),
        ...(textFeedbackEnabled !== undefined && { textFeedbackEnabled }),
        ...(theme !== undefined && { theme }),
        ...(media !== undefined && { media }),
      },
    });

    res.json({ survey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update survey" });
  }
}

export async function publishSurvey(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const existing = await prisma.survey.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "Survey not found" });

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: { status: "PUBLISHED" },
    });

    res.json({ survey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to publish survey" });
  }
}

export async function unpublishSurvey(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const existing = await prisma.survey.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "Survey not found" });

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: { status: "DRAFT" },
    });

    res.json({ survey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to unpublish survey" });
  }
}

export async function listResponses(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const { surveyId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const [responses, total] = await Promise.all([
      prisma.surveyResponse.findMany({
        where: { surveyId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          attachment: true,
          transcript: true,
          insight: true,
        },
      }),
      prisma.surveyResponse.count({ where: { surveyId } }),
    ]);

    res.json({
      responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch responses" });
  }
}

export async function processSingleResponse(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const { surveyId, responseId } = req.params;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const response = await prisma.surveyResponse.findFirst({
      where: { id: responseId, surveyId },
    });
    if (!response) return res.status(404).json({ error: "Response not found" });

    await enqueueProcessResponse(responseId);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process response" });
  }
}

const analysisResultSchema = z.object({
  totalResponses: z.number(),
  summary: z.string(),
  sentimentBreakdown: z.record(z.string(), z.number()),
  topTags: z.array(z.string()),
  commonThemes: z.array(z.object({ theme: z.string(), frequency: z.string(), sentiment: z.string() })),
  recommendations: z.array(z.object({ priority: z.string(), action: z.string(), impact: z.string() })),
});

export async function getSurveyAnalysis(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const { surveyId } = req.params;
    const force = req.query._force === "1";

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    if (!force && survey.analysisResult) {
      const parsed = analysisResultSchema.safeParse(survey.analysisResult);
      if (parsed.success) {
        res.json({ analysis: parsed.data });
        return;
      }
    }

    const analysis = await analyzeSurvey(surveyId);

    await prisma.survey.update({
      where: { id: surveyId },
      data: { analysisResult: JSON.parse(JSON.stringify(analysis)) },
    });

    res.json({ analysis });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to analyze survey" });
  }
}

export async function deleteSurvey(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const surveyId = req.params.id;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      select: { id: true },
    });
    const responseIds = responses.map((r) => r.id);

    await prisma.$transaction([
      prisma.aIInsight.deleteMany({ where: { responseId: { in: responseIds } } }),
      prisma.transcript.deleteMany({ where: { responseId: { in: responseIds } } }),
      prisma.responseAttachment.deleteMany({ where: { responseId: { in: responseIds } } }),
      prisma.surveyResponse.deleteMany({ where: { surveyId } }),
      prisma.survey.delete({ where: { id: surveyId } }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete survey" });
  }
}

export async function deleteResponse(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const { surveyId, responseId } = req.params;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const existing = await prisma.surveyResponse.findFirst({
      where: { id: responseId, surveyId },
    });
    if (!existing) return res.status(404).json({ error: "Response not found" });

    await prisma.$transaction([
      prisma.aIInsight.deleteMany({ where: { responseId } }),
      prisma.transcript.deleteMany({ where: { responseId } }),
      prisma.responseAttachment.deleteMany({ where: { responseId } }),
      prisma.surveyResponse.delete({ where: { id: responseId } }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete response" });
  }
}

export async function exportSurveyCSV(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req);
    const { surveyId } = req.params;

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, orgId },
    });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId, status: "PROCESSED" },
      orderBy: { createdAt: "desc" },
      include: {
        transcript: true,
        insight: true,
        attachment: true,
      },
    });

    const headers = ["ID", "Date", "Duration (s)", "Sentiment", "Urgency", "Tags", "Summary", "Transcript", "Audio URL"];

    const escape = (val: unknown): string => {
      const str = val === null || val === undefined
        ? ""
        : typeof val === "object"
          ? JSON.stringify(val)
          : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = responses.map((r) => [
      escape(r.id),
      escape(new Date(r.createdAt).toISOString()),
      escape(r.durationSec),
      escape(r.insight?.sentiment ?? ""),
      escape(r.insight?.urgency ?? ""),
      escape(r.insight?.tags ?? []),
      escape(r.insight?.summary ?? ""),
      escape(r.transcript?.text ?? ""),
      escape(r.attachment?.r2Url ?? ""),
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `${survey.title.replace(/[^a-z0-9]/gi, "_")}_responses.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export responses" });
  }
}
