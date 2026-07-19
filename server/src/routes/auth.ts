import { register, login, logout } from "../controllers/auth";
import { requireAuth } from "../middleware/auth";
import { Router } from "express";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", requireAuth, logout);


