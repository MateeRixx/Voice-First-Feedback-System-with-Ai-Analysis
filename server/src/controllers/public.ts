import { prisma } from "../lib/prisma";
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
