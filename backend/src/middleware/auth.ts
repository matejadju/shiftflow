import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import type { Role } from "../generated/prisma/enums.js";

export type AuthenticatedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Locals {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  let userId: string;

  try {
    const payload = jwt.verify(match[1], config.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "shiftflow-api",
      audience: "shiftflow-web"
    });

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number"
    ) {
      throw new Error("Neveljaven žeton.");
    }

    userId = payload.sub;
  } catch {
    res.status(401).json({
      message: "Prijava ni veljavna ali je potekla."
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      res.status(401).json({ message: "Prijava ni več veljavna." });
      return;
    }

    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...allowedRoles: Role[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user;

    if (!user) {
      res.status(401).json({ message: "Potrebna je prijava." });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        message: "Nimate dovoljenja za to dejanje."
      });
      return;
    }

    next();
  };
}