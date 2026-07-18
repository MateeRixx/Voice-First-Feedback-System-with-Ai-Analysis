import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  list,
  getById,
  create,
  update,
  publishSurvey,
  unpublishSurvey,
} from "../controllers/survey";

const router = Router();

router.use(requireAuth);

router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.patch("/:id", update);
router.post("/:id/publish", publishSurvey);
router.post("/:id/unpublish", unpublishSurvey);

export default router;
