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
} from "../controllers/survey";

const router = Router();

router.use(requireAuth);

router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.patch("/:id", update);
router.post("/:id/publish", publishSurvey);
router.post("/:id/unpublish", unpublishSurvey);
router.get("/:surveyId/responses", listResponses);
router.post("/:surveyId/responses/:responseId/process", processSingleResponse);
router.get("/:surveyId/analysis", getSurveyAnalysis);
router.delete("/:surveyId/responses/:responseId", deleteResponse);

export default router;
