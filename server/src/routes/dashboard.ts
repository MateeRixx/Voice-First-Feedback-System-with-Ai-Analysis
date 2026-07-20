import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { overview } from "../controllers/dashboard";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/overview", overview);
