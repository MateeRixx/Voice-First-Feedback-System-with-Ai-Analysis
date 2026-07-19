import { Router } from "express";
import { getSurveyBySlug, getUploadSignature, submitResponse } from "../controllers/public";

export const publicRouter = Router();

publicRouter.get("/surveys/:slug", getSurveyBySlug);
publicRouter.get("/surveys/:slug/upload-signature", getUploadSignature);
publicRouter.post("/surveys/:slug/responses", submitResponse);
