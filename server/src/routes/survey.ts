import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  list,
  getById,
  create,
  update,
  publishSurvey,
  unpublishSurvey,
  listResponses,
  processSingleResponse,
  getSurveyAnalysis,
  deleteResponse,
  deleteSurvey,
  exportSurveyCSV,
} from "../controllers/survey";

export const surveyRouter = Router();

surveyRouter.use(requireAuth);

surveyRouter.get("/", list);
surveyRouter.get("/:id", getById);
surveyRouter.post("/", create);
surveyRouter.patch("/:id", update);
surveyRouter.post("/:id/publish", publishSurvey);
surveyRouter.post("/:id/unpublish", unpublishSurvey);
surveyRouter.get("/:surveyId/responses", listResponses);
surveyRouter.get("/:surveyId/export/csv", exportSurveyCSV);
surveyRouter.post("/:surveyId/responses/:responseId/process", processSingleResponse);
surveyRouter.get("/:surveyId/analysis", getSurveyAnalysis);
surveyRouter.delete("/:surveyId/responses/:responseId", deleteResponse);
surveyRouter.delete("/:id", deleteSurvey);
