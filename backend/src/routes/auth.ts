import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

// Uporabi se tudi ob neobstoječem uporabniku, da se izvede bcrypt preverba.
const dummyPasswordHash = bcrypt.hashSync(
  "shiftflow-dummy-password",
  12
);

router.post("/login", async (req, res, next) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Vnesite veljaven e-poštni naslov in geslo."
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: result.data.email }
    });

    const passwordMatches = await bcrypt.compare(
      result.data.password,
      user?.passwordHash ?? dummyPasswordHash
    );

    if (!user || !passwordMatches) {
      res.status(401).json({
        message: "Napačen e-poštni naslov ali geslo."
      });
      return;
    }

    const token = jwt.sign({}, config.JWT_SECRET, {
      algorithm: "HS256",
      subject: user.id,
      expiresIn: "1h",
      issuer: "shiftflow-api",
      audience: "shiftflow-web"
    });

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (_req, res) => {
  res.json({ user: res.locals.user });
});

export default router;