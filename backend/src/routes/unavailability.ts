import { Router } from "express";
import { Role } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  formatDate,
  formatTime,
  toDatabaseDate,
  toDatabaseTime
} from "../lib/shift-time.js";
import {
  createUnavailabilitySchema,
  unavailabilityIdSchema
} from "../validation/unavailability.js";
import { isUnavailabilityOverlapError } from "../lib/unavailability-conflict.js";

const router = Router();

router.use(requireAuth, requireRole(Role.EMPLOYEE));

type UnavailabilityRecord = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
};

function serialize(entry: UnavailabilityRecord) {
  return {
    id: entry.id,
    date: formatDate(entry.date),
    startTime: formatTime(entry.startTime),
    endTime: formatTime(entry.endTime)
  };
}

router.post("/", async (req, res, next) => {
  const result = createUnavailabilitySchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Neveljavni podatki nerazpoložljivosti.",
      errors: result.error.flatten().fieldErrors
    });
    return;
  }

  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  const conflictMessage =
    "Za izbrani čas že imate vneseno nerazpoložljivost.";

  try {
    const input = result.data;
    const date = toDatabaseDate(input.date);
    const startTime = toDatabaseTime(input.startTime);
    const endTime = toDatabaseTime(input.endTime);

    const existing = await prisma.unavailability.findFirst({
      where: {
        employeeId: user.id,
        date,
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      },
      select: { id: true }
    });

    if (existing) {
      res.status(409).json({ message: conflictMessage });
      return;
    }

    const entry = await prisma.unavailability.create({
      data: {
        employeeId: user.id,
        date,
        startTime,
        endTime
      }
    });

    res.status(201).json({ unavailability: serialize(entry) });
  } catch (error) {
    if (isUnavailabilityOverlapError(error)) {
      res.status(409).json({ message: conflictMessage });
      return;
    }

    next(error);
  }
});

router.get("/", async (_req, res, next) => {
  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  try {
    const entries = await prisma.unavailability.findMany({
      where: { employeeId: user.id },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true
      },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" },
        { id: "asc" }
      ]
    });

    res.json({ unavailabilities: entries.map(serialize) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const result = unavailabilityIdSchema.safeParse(req.params.id);

  if (!result.success) {
    res.status(400).json({
      message: "Neveljaven identifikator nerazpoložljivosti."
    });
    return;
  }

  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  try {
    const deleted = await prisma.unavailability.deleteMany({
      where: {
        id: result.data,
        employeeId: user.id
      }
    });

    if (deleted.count === 0) {
      res.status(404).json({
        message: "Vnos nerazpoložljivosti ne obstaja."
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;