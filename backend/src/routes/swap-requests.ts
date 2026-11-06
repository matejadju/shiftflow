import { Router } from "express";
import { Prisma } from "../generated/prisma/client.js";
import {
  Role,
  ShiftStatus,
  SwapStatus
} from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createSwapRequestSchema,
  respondToSwapRequestSchema,
  swapRequestIdSchema
} from "../validation/swap-requests.js";
import { formatDate, formatTime } from "../lib/shift-time.js";

const router = Router();

router.use(requireAuth, requireRole(Role.EMPLOYEE));

router.post("/", async (req, res, next) => {
  const result = createSwapRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Izberite veljavno izmeno in prevzemnika.",
      errors: result.error.flatten().fieldErrors
    });
    return;
  }

  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  const { shiftId, recipientId } = result.data;

  if (recipientId === user.id) {
    res.status(400).json({
      message: "Za prevzemnika izberite drugega zaposlenega."
    });
    return;
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: {
        employeeId: true,
        status: true
      }
    });

    // Tuja izmena ni razkrita uporabniku.
    if (!shift || shift.employeeId !== user.id) {
      res.status(404).json({
        message: "Izmena ne obstaja."
      });
      return;
    }

    if (shift.status !== ShiftStatus.PUBLISHED) {
      res.status(400).json({
        message: "Menjavo lahko predlagate samo za objavljeno izmeno."
      });
      return;
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { role: true }
    });

    if (!recipient || recipient.role !== Role.EMPLOYEE) {
      res.status(400).json({
        message: "Izberite obstoječega zaposlenega za prevzemnika."
      });
      return;
    }

    const existing = await prisma.swapRequest.findFirst({
      where: {
        shiftId,
        status: {
          in: [SwapStatus.PENDING, SwapStatus.ACCEPTED]
        }
      },
      select: { id: true }
    });

    if (existing) {
      res.status(409).json({
        message: "Za to izmeno že obstaja odprta zahteva za menjavo."
      });
      return;
    }

    const swapRequest = await prisma.swapRequest.create({
      data: {
        shiftId,
        requesterId: user.id,
        recipientId,
        status: SwapStatus.PENDING
      },
      select: {
        id: true,
        shiftId: true,
        requesterId: true,
        recipientId: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({ swapRequest });
  } catch (error) {
    // Enolični indeks prepreči dve odprti zahtevi tudi ob
    // sočasni oddaji.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        message: "Za to izmeno že obstaja odprta zahteva za menjavo."
      });
      return;
    }

    next(error);
  }
});

router.get("/recipients", async (_req, res, next) => {
  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  try {
    const employees = await prisma.user.findMany({
      where: {
        role: Role.EMPLOYEE,
        id: { not: user.id }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
        { id: "asc" }
      ]
    });

    res.json({ employees });
  } catch (error) {
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
    const requests = await prisma.swapRequest.findMany({
      where: {
        OR: [
          { requesterId: user.id },
          { recipientId: user.id }
        ]
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ]
    });

    res.json({
      swapRequests: requests.map((entry) => ({
        id: entry.id,
        status: entry.status,
        createdAt: entry.createdAt,
        requester: entry.requester,
        recipient: entry.recipient,
        shift: {
          id: entry.shift.id,
          date: formatDate(entry.shift.date),
          startTime: formatTime(entry.shift.startTime),
          endTime: formatTime(entry.shift.endTime)
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/respond", async (req, res, next) => {
  const idResult = swapRequestIdSchema.safeParse(req.params.id);
  const bodyResult = respondToSwapRequestSchema.safeParse(req.body);

  if (!idResult.success || !bodyResult.success) {
    res.status(400).json({
      message: "Podajte veljavno zahtevo in odločitev ACCEPT ali REJECT."
    });
    return;
  }

  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  const id = idResult.data;
  const status =
    bodyResult.data.decision === "ACCEPT"
      ? SwapStatus.ACCEPTED
      : SwapStatus.REJECTED;

  try {
    const existing = await prisma.swapRequest.findFirst({
      where: {
        id,
        recipientId: user.id
      },
      select: {
        status: true
      }
    });

    // Ne razkrivamo zahtev, pri katerih uporabnik ni prevzemnik.
    if (!existing) {
      res.status(404).json({
        message: "Prejeta zahteva ne obstaja."
      });
      return;
    }

    if (existing.status !== SwapStatus.PENDING) {
      res.status(409).json({
        message: "Na to zahtevo ni več mogoče odgovoriti."
      });
      return;
    }

    // Pogoj preverimo tudi pri posodobitvi, da ob sočasnih
    // odgovorih uspe samo prvi.
    const updated = await prisma.swapRequest.updateMany({
      where: {
        id,
        recipientId: user.id,
        status: SwapStatus.PENDING
      },
      data: { status }
    });

    if (updated.count === 0) {
      res.status(409).json({
        message: "Na to zahtevo ni več mogoče odgovoriti."
      });
      return;
    }

    res.json({
      swapRequest: {
        id,
        status
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;