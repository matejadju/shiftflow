import { Router } from "express";
import { Role, SwapStatus } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { formatDate, formatTime } from "../lib/shift-time.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  decideSwap,
  SwapDecisionError
} from "../services/swap-approval.js";
import {
  managerSwapDecisionSchema,
  managerSwapIdSchema
} from "../validation/manager-swaps.js";

const router = Router();

router.use(requireAuth, requireRole(Role.MANAGER));

router.get("/", async (_req, res, next) => {
  try {
    const requests = await prisma.swapRequest.findMany({
      where: {
        status: SwapStatus.ACCEPTED
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
        { createdAt: "asc" },
        { id: "asc" }
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

router.patch("/:id/decision", async (req, res, next) => {
  const idResult = managerSwapIdSchema.safeParse(req.params.id);
  const bodyResult = managerSwapDecisionSchema.safeParse(req.body);

  if (!idResult.success || !bodyResult.success) {
    res.status(400).json({
      message:
        "Podajte veljavno zahtevo in odločitev APPROVE ali REJECT."
    });
    return;
  }

  try {
    const swapRequest = await decideSwap(
      idResult.data,
      bodyResult.data.decision
    );

    res.json({ swapRequest });
  } catch (error) {
    if (error instanceof SwapDecisionError) {
      res.status(error.status).json({
        message: error.message
      });
      return;
    }

    next(error);
  }
});

export default router;