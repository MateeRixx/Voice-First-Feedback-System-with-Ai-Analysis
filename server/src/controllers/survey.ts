import { prisma } from "../lib/prisma";
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
    const { title, subtitle, voiceDurationLimitSec, textFeedbackEnabled } = req.body;

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
