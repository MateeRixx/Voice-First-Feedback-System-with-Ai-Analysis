import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { Request, Response } from "express"

async function securePassword(plainTextPassword: string) {
    const saltRounds = 12;
    return bcrypt.hash(plainTextPassword, saltRounds);
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What is your favorite book?",
  "What is your favorite food?",
] as const;

async function register(req: Request, res: Response) {
    try {
        const { email, password, orgName, securityQuestion, securityAnswer } = req.body;

        if (!email || !password || !orgName || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ error: "Email, password, organization name, security question, and answer are required" });
        }
        if (!SECURITY_QUESTIONS.includes(securityQuestion)) {
            return res.status(400).json({ error: "Invalid security question" });
        }
        if (securityAnswer.length < 2) {
            return res.status(400).json({ error: "Security answer must be at least 2 characters" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const [hashedPassword, hashedAnswer] = await Promise.all([
            securePassword(password),
            securePassword(securityAnswer.toLowerCase().trim()),
        ]);

        const result = await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: { name: orgName, slug: orgName.toLowerCase().replace(/\s+/g, "-") }
            });
            const user = await tx.user.create({
                data: { email, passwordHash: hashedPassword, securityQuestion, securityAnswer: hashedAnswer, orgId: org.id }
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

async function getSecurityQuestion(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { securityQuestion: true },
    });

    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    res.json({ question: user.securityQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get security question" });
  }
}

async function resetPassword(req: Request, res: Response) {
  try {
    const { email, securityAnswer, newPassword } = req.body;

    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: "Email, security answer, and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    const valid = await bcrypt.compare(securityAnswer.toLowerCase().trim(), user.securityAnswer);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect security answer" });
    }

    const hashedPassword = await securePassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

export { register, login, logout, getSecurityQuestion, resetPassword, SECURITY_QUESTIONS };
