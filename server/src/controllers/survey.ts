import { prisma } from "../lib/prisma";
import { processResponse } from "../lib/process-response";
import { analyzeSurvey } from "../lib/analyze-survey";
import type { Request, Response } from "express";

export async function list(req: Request, res: Response) {
  try {
    const orgId = req.user!.orgId;
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
    const orgId = req.user!.orgId;
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
    const orgId = req.user!.orgId;
    const { title, subtitle, voiceDurationLimitSec, textFeedbackEnabled, theme } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

    const survey = await prisma.survey.create({
      data: {
        orgId,
        title,
        subtitle: subtitle || null,
        slug,
        voiceDurationLimitSec: voiceDurationLimitSec || 120,
        textFeedbackEnabled: textFeedbackEnabled ?? false,
        ...(theme !== undefined && { theme }),
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
    const orgId = req.user!.orgId;
    const { title, subtitle, voiceDurationLimitSec, textFeedbackEnabled, theme } = req.body;

    const existing = await prisma.survey.findFirst({ where: { id: req.params.id, orgId } });
    if (!existing) return res.status(404).json({ error: "Survey not found" });

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(voiceDurationLimitSec !== undefined && { voiceDurationLimitSec }),
        ...(textFeedbackEnabled !== undefined && { textFeedbackEnabled }),
        ...(theme !== undefined && { theme }),
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
    const orgId = req.user!.orgId;
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
    const orgId = req.user!.orgId;
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
    const orgId = req.user!.orgId;
    const { surveyId } = req.params;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { createdAt: "desc" },
      include: {
        attachment: true,
        transcript: true,
        insight: true,
      },
    });

    res.json({ responses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch responses" });
  }
}

export async function processSingleResponse(req: Request, res: Response) {
  try {
    const orgId = req.user!.orgId;
    const { surveyId, responseId } = req.params;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const response = await prisma.surveyResponse.findFirst({
      where: { id: responseId, surveyId },
    });
    if (!response) return res.status(404).json({ error: "Response not found" });

    await processResponse(responseId);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process response" });
  }
}

export async function getSurveyAnalysis(req: Request, res: Response) {
  try {
    const orgId = req.user!.orgId;
    const { surveyId } = req.params;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const analysis = await analyzeSurvey(surveyId);

    res.json({ analysis });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze survey" });
  }
}

export async function deleteResponse(req: Request, res: Response) {
  try {
    const orgId = req.user!.orgId;
    const { surveyId, responseId } = req.params;

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, orgId } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    const existing = await prisma.surveyResponse.findFirst({
      where: { id: responseId, surveyId },
    });
    if (!existing) return res.status(404).json({ error: "Response not found" });

    await prisma.surveyResponse.delete({ where: { id: responseId } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete response" });
  }
}
