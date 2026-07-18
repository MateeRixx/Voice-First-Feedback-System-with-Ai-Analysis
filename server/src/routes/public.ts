import { Router } from "express";
import { getSurveyBySlug } from "../controllers/public";

const router = Router();

router.get("/surveys/:slug", getSurveyBySlug);

export default router;
