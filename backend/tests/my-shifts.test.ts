import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { prisma } from "../src/lib/prisma.js";
import { Role, ShiftStatus } from "../src/generated/prisma/enums.js";
import {
  toDatabaseDate,
  toDatabaseTime
} from "../src/lib/shift-time.js";

assert.equal(
  new URL(config.DATABASE_URL).pathname,
  "/shiftflow_api_test",
  "Teste zaženite samo na bazi shiftflow_api_test."
);

const app = createApp(config.FRONTEND_URL);
const userIds: string[] = [];
const shiftIds: string[] = [];

const weekStart = "2030-02-04";
const emptyWeek = "2030-03-04";

let employeeToken: string;
let otherEmployeeToken: string;
let managerToken: string;

let mondayId: string;
let sundayId: string;
let draftId: string;
let otherShiftId: string;

function issueToken(userId: string): string {
  return jwt.sign({}, config.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: "1h",
    issuer: "shiftflow-api",
    audience: "shiftflow-web"
  });
}

before(async () => {
  const suffix = randomUUID();
  const passwordHash = await bcrypt.hash(randomUUID(), 4);

  async function createUser(name: string, role: Role) {
    const user = await prisma.user.create({
      data: {
        firstName: name,
        lastName: "Test",
        email: `${name}-${suffix}@example.com`,
        passwordHash,
        role
      }
    });

    userIds.push(user.id);
    return user;
  }

  const employee = await createUser("employee", Role.EMPLOYEE);
  const other = await createUser("other", Role.EMPLOYEE);
  const manager = await createUser("manager", Role.MANAGER);

  employeeToken = issueToken(employee.id);
  otherEmployeeToken = issueToken(other.id);
  managerToken = issueToken(manager.id);

  async function createShift(
    employeeId: string,
    date: string,
    status: ShiftStatus
  ) {
    const shift = await prisma.shift.create({
      data: {
        employeeId,
        date: toDatabaseDate(date),
        startTime: toDatabaseTime("08:00"),
        endTime: toDatabaseTime("16:00"),
        status
      }
    });

    shiftIds.push(shift.id);
    return shift.id;
  }

  mondayId = await createShift(
    employee.id,
    weekStart,
    ShiftStatus.PUBLISHED
  );

  sundayId = await createShift(
    employee.id,
    "2030-02-10",
    ShiftStatus.PUBLISHED
  );

  draftId = await createShift(
    employee.id,
    "2030-02-05",
    ShiftStatus.DRAFT
  );

  otherShiftId = await createShift(
    other.id,
    weekStart,
    ShiftStatus.PUBLISHED
  );

  await createShift(
    employee.id,
    "2030-02-03",
    ShiftStatus.PUBLISHED
  );

  await createShift(
    employee.id,
    "2030-02-11",
    ShiftStatus.PUBLISHED
  );
});

test("Osebni urnik zahteva prijavo in vlogo zaposlenega", async () => {
  await request(app)
    .get("/api/me/shifts")
    .query({ weekStart })
    .expect(401);

  await request(app)
    .get("/api/me/shifts")
    .query({ weekStart })
    .set("Authorization", `Bearer ${managerToken}`)
    .expect(403);
});

test("Zaposleni vidi samo lastne objavljene izmene izbranega tedna", async () => {
  const response = await request(app)
    .get("/api/me/shifts")
    .query({ weekStart })
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(200);

  assert.equal(response.body.weekStart, weekStart);

  assert.deepEqual(response.body.shifts, [
    {
      id: mondayId,
      date: weekStart,
      startTime: "08:00",
      endTime: "16:00"
    },
    {
      id: sundayId,
      date: "2030-02-10",
      startTime: "08:00",
      endTime: "16:00"
    }
  ]);

  const ids = response.body.shifts.map(
    (shift: { id: string }) => shift.id
  );

  assert.equal(ids.includes(draftId), false);
  assert.equal(ids.includes(otherShiftId), false);

  const otherResponse = await request(app)
    .get("/api/me/shifts")
    .query({ weekStart })
    .set("Authorization", `Bearer ${otherEmployeeToken}`)
    .expect(200);

  assert.deepEqual(
    otherResponse.body.shifts.map((shift: { id: string }) => shift.id),
    [otherShiftId]
  );
});

test("Teden brez izmen vrne prazen seznam", async () => {
  const response = await request(app)
    .get("/api/me/shifts")
    .query({ weekStart: emptyWeek })
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(200);

  assert.deepEqual(response.body, {
    weekStart: emptyWeek,
    shifts: []
  });
});

test("Manjkajoč ali neveljaven začetek tedna je zavrnjen", async () => {
  for (const query of [
    {},
    { weekStart: "invalid" },
    { weekStart: "2030-02-30" },
    { weekStart: "2030-02-05" }
  ]) {
    await request(app)
      .get("/api/me/shifts")
      .query(query)
      .set("Authorization", `Bearer ${employeeToken}`)
      .expect(400);
  }
});

test("Identitete zaposlenega ni mogoče določiti s parametrom", async () => {
  await request(app)
    .get("/api/me/shifts")
    .query({
      weekStart,
      employeeId: userIds[1]
    })
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(400);
});

after(async () => {
  try {
    await prisma.shift.deleteMany({
      where: { id: { in: shiftIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  } finally {
    await prisma.$disconnect();
  }
});