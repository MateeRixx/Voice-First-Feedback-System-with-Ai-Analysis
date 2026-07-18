import { prisma } from "../lib/prisma";
import { generateUploadSignature } from "../lib/cloudinary";
import { processResponse } from "../lib/process-response";
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
        orgName: survey.organization.name,
        voiceDurationLimitSec: survey.voiceDurationLimitSec,
        textFeedbackEnabled: survey.textFeedbackEnabled,
        theme: survey.theme,
        responseCount: survey._count.responses,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load survey" });
  }
}

export async function getUploadSignature(_req: Request, res: Response) {
  try {
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
    const { audioUrl, durationSec, textFeedback } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: "audioUrl is required" });
    }

    const survey = await prisma.survey.findUnique({
      where: { slug },
    });

    if (!survey || survey.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Survey not found" });
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        durationSec: durationSec ?? null,
        textFeedback: textFeedback ?? null,
        respondentMeta: {
          userAgent: req.headers["user-agent"] ?? null,
        },
        attachment: {
          create: {
            storageKey: `truetone-audio/${survey.slug}/${Date.now()}.webm`,
            mimeType: "audio/webm",
            sizeBytes: 0,
            r2Url: audioUrl,
          },
        },
      },
      include: {
        attachment: true,
      },
    });

    // Respond immediately — process audio in background
    res.status(201).json({ response: { id: response.id } });
    processResponse(response.id).catch((err) => {
      console.error(`Auto-process failed for ${response.id}:`, err);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit response" });
  }
}
