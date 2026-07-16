import { register, login, logout } from "../controllers/auth";
import { requireAuth } from "../middleware/auth";
import { Router } from "express";
const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", requireAuth, logout);

export default router;


