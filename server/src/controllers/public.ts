import { prisma } from "../lib/prisma";
import { generateUploadSignature } from "../lib/cloudinary";
import { enqueueProcessResponse } from "../lib/job-queue";
import type { Request, Response } from "express";

export async function getSurveyBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { slug },
      include: {
        organization: { select: { name: true } },
        _count: { select: { responses: true } },
      },
    });

    if (!survey || survey.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Survey not found" });
    }

    res.json({
      survey: {
        id: survey.id,
        title: survey.title,
        subtitle: survey.subtitle,
        description: survey.description,
        orgName: survey.organization.name,
        voiceDurationLimitSec: survey.voiceDurationLimitSec,
        textFeedbackEnabled: survey.textFeedbackEnabled,
        theme: survey.theme,
        media: survey.media,
        responseCount: survey._count.responses,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load survey" });
  }
}

export async function getUploadSignature(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const survey = await prisma.survey.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!survey || survey.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Survey not found" });
    }

    const sig = generateUploadSignature();
    res.json(sig);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate upload signature" });
  }
}

export async function submitResponse(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const { audioUrl, durationSec, textFeedback, sizeBytes } = req.body;

    const survey = await prisma.survey.findUnique({
      where: { slug },
    });

    if (!survey || survey.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Survey not found" });
    }

    if (!audioUrl && !textFeedback) {
      return res.status(400).json({ error: "Either audioUrl or textFeedback is required" });
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        durationSec: durationSec ?? null,
        textFeedback: textFeedback ?? null,
        respondentMeta: {
          userAgent: req.headers["user-agent"] ?? null,
        },
        ...(audioUrl ? {
          attachment: {
            create: {
              storageKey: `truetone-audio/${survey.slug}/${Date.now()}.webm`,
              mimeType: "audio/webm",
              sizeBytes: sizeBytes ?? 0,
              r2Url: audioUrl,
            },
          },
        } : {}),
      },
      include: {
        attachment: true,
      },
    });

    // Enqueue for background processing
    await enqueueProcessResponse(response.id)
    res.status(201).json({ response: { id: response.id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit response" });
  }
}
