import { prisma } from "../lib/prisma"
import { assertAuth } from "../middleware/auth"
import type { Request, Response } from "express"

export async function overview(req: Request, res: Response) {
  try {
    const { orgId } = assertAuth(req)

    const [totalResponses, totalSurveys, publishedSurveys, processedCount, failedCount, sentimentCounts] =
      await Promise.all([
        prisma.surveyResponse.count({ where: { survey: { orgId } } }),
        prisma.survey.count({ where: { orgId } }),
        prisma.survey.count({ where: { orgId, status: "PUBLISHED" } }),
        prisma.surveyResponse.count({ where: { survey: { orgId }, status: "PROCESSED" } }),
        prisma.surveyResponse.count({ where: { survey: { orgId }, status: "FAILED" } }),
        prisma.surveyResponse.groupBy({
          by: ["status"],
          where: { survey: { orgId }, status: "PROCESSED", insight: { isNot: null } },
          _count: true,
        }),
      ])

    const totalProcessed = sentimentCounts.reduce((sum, s) => sum + s._count, 0)

    const recentResponses = await prisma.surveyResponse.findMany({
      where: { survey: { orgId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        survey: { select: { title: true } },
        insight: { select: { summary: true, sentiment: true, urgency: true } },
      },
    });

    res.json({
      stats: {
        totalResponses,
        totalSurveys,
        publishedSurveys,
        draftSurveys: totalSurveys - publishedSurveys,
        processedCount,
        failedCount,
        processingRate: totalResponses > 0 ? Math.round((processedCount / totalResponses) * 100) : 0,
        totalProcessed,
      },
      recentResponses: recentResponses.map((r) => ({
        id: r.id,
        surveyTitle: r.survey.title,
        sentiment: r.insight?.sentiment ?? null,
        urgency: r.insight?.urgency ?? null,
        durationSec: r.durationSec,
        createdAt: r.createdAt,
        summary: r.insight?.summary ?? null,
        status: r.status,
      })),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to fetch overview" })
  }
}
