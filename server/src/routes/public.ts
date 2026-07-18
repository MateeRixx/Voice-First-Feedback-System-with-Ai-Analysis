import { Router } from "express";
import { getSurveyBySlug, getUploadSignature, submitResponse } from "../controllers/public";

const router = Router();

router.get("/surveys/:slug", getSurveyBySlug);
router.get("/surveys/:slug/upload-signature", getUploadSignature);
router.post("/surveys/:slug/responses", submitResponse);

export default router;
