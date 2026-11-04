import { Router } from "express";
import { Role, ShiftStatus } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  formatDate,
  formatTime,
  getWeekEnd,
  toDatabaseDate,
  toDatabaseTime
} from "../lib/shift-time.js";
import {
  createShiftSchema,
  publishWeekSchema,
  weekQuerySchema
} from "../validation/shifts.js";

const router = Router();

router.use(requireAuth, requireRole(Role.MANAGER));

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true
} as const;

type ShiftResponseInput = {
  id: string;
  employeeId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: ShiftStatus;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

function serializeShift(shift: ShiftResponseInput) {
  return {
    id: shift.id,
    employeeId: shift.employeeId,
    date: formatDate(shift.date),
    startTime: formatTime(shift.startTime),
    endTime: formatTime(shift.endTime),
    status: shift.status,
    employee: shift.employee
  };
}

router.get("/employees", async (_req, res, next) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: Role.EMPLOYEE },
      select: employeeSelect,
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

router.post("/", async (req, res, next) => {
  const result = createShiftSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Neveljavni podatki izmene.",
      errors: result.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const input = result.data;

    const employee = await prisma.user.findUnique({
      where: { id: input.employeeId },
      select: { role: true }
    });

    if (!employee || employee.role !== Role.EMPLOYEE) {
      res.status(400).json({
        message: "Izberite obstoječega zaposlenega."
      });
      return;
    }

    const shift = await prisma.shift.create({
      data: {
        employeeId: input.employeeId,
        date: toDatabaseDate(input.date),
        startTime: toDatabaseTime(input.startTime),
        endTime: toDatabaseTime(input.endTime),
        status: ShiftStatus.DRAFT
      },
      include: {
        employee: { select: employeeSelect }
      }
    });

    res.status(201).json({ shift: serializeShift(shift) });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  const result = weekQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({
      message: "Podajte veljaven ponedeljek v parametru weekStart.",
      errors: result.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const { weekStart } = result.data;

    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: toDatabaseDate(weekStart),
          lt: getWeekEnd(weekStart)
        }
      },
      include: {
        employee: { select: employeeSelect }
      },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" },
        { id: "asc" }
      ]
    });

    res.json({
      weekStart,
      shifts: shifts.map(serializeShift)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/publish", async (req, res, next) => {
  const result = publishWeekSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Podajte veljaven ponedeljek v polju weekStart.",
      errors: result.error.flatten().fieldErrors
    });
    return;
  }

  try {
    const { weekStart } = result.data;

    const resultUpdate = await prisma.shift.updateMany({
      where: {
        date: {
          gte: toDatabaseDate(weekStart),
          lt: getWeekEnd(weekStart)
        },
        status: ShiftStatus.DRAFT
      },
      data: {
        status: ShiftStatus.PUBLISHED
      }
    });

    res.json({
      weekStart,
      publishedCount: resultUpdate.count
    });
  } catch (error) {
    next(error);
  }
});

export default router;