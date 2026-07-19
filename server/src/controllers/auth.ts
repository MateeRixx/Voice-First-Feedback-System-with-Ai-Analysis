import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { Request, Response } from "express"

async function securePassword(plainTextPassword: string) {
    const saltRounds = 12;
    return bcrypt.hash(plainTextPassword, saltRounds);
}

async function register(req: Request, res: Response) {
    try {
        const { email, password, orgName } = req.body;

        if (!email || !password || !orgName) {
            return res.status(400).json({ error: "Email, password, and organization name are required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const hashedPassword = await securePassword(password);

        const result = await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: { name: orgName, slug: orgName.toLowerCase().replace(/\s+/g, "-") }
            });
            const user = await tx.user.create({
                data: { email, passwordHash: hashedPassword, orgId: org.id }
            });
            return { org, user };
        });

        const token = jwt.sign(
            { userId: result.user.id, orgId: result.org.id, role: result.user.role },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: { id: result.user.id, email: result.user.email, role: result.user.role, orgId: result.org.id }
        });
    } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).json({ error: "Registration failed" });
    }
}

async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, orgId: user.orgId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
}

async function logout(req: Request, res: Response) {
  try {
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Logout failed" });
  }
}

export { register, login, logout };
