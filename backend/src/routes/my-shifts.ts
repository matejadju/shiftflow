import { Router } from "express";
import { Role, ShiftStatus } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  formatDate,
  formatTime,
  getWeekEnd,
  toDatabaseDate
} from "../lib/shift-time.js";
import { weekQuerySchema } from "../validation/shifts.js";

const router = Router();

router.use(requireAuth, requireRole(Role.EMPLOYEE));

router.get("/shifts", async (req, res, next) => {
  const result = weekQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      message: "Podajte veljaven ponedeljek v parametru weekStart.",
      errors: result.error.flatten().fieldErrors
    });
    return;
  }

  const user = res.locals.user;

  if (!user) {
    res.status(401).json({ message: "Potrebna je prijava." });
    return;
  }

  try {
    const { weekStart } = result.data;

    const shifts = await prisma.shift.findMany({
      where: {
        employeeId: user.id,
        status: ShiftStatus.PUBLISHED,
        date: {
          gte: toDatabaseDate(weekStart),
          lt: getWeekEnd(weekStart)
        }
      },
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

    res.json({
      weekStart,
      shifts: shifts.map((shift) => ({
        id: shift.id,
        date: formatDate(shift.date),
        startTime: formatTime(shift.startTime),
        endTime: formatTime(shift.endTime)
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;