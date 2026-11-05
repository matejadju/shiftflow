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
import { isShiftOverlapError } from "../src/lib/shift-conflict.js";

assert.equal(
  new URL(config.DATABASE_URL).pathname,
  "/shiftflow_api_test",
  "Teste zaženite samo na bazi shiftflow_api_test."
);

const app = createApp(config.FRONTEND_URL);
const userIds: string[] = [];

let employeeId: string;
let otherEmployeeId: string;
let managerToken: string;

before(async () => {
  const suffix = randomUUID();
  const passwordHash = await bcrypt.hash(randomUUID(), 4);

  async function createUser(name: string, role: Role) {
    const user = await prisma.user.create({
      data: {
        firstName: name,
        lastName: "OverlapTest",
        email: `${name}-${suffix}@example.com`,
        passwordHash,
        role
      }
    });

    userIds.push(user.id);
    return user;
  }

  const employee = await createUser("overlap-employee", Role.EMPLOYEE);
  const other = await createUser("overlap-other", Role.EMPLOYEE);
  const manager = await createUser("overlap-manager", Role.MANAGER);

  employeeId = employee.id;
  otherEmployeeId = other.id;

  managerToken = jwt.sign({}, config.JWT_SECRET, {
    algorithm: "HS256",
    subject: manager.id,
    expiresIn: "1h",
    issuer: "shiftflow-api",
    audience: "shiftflow-web"
  });
});

function postShift(
  date: string,
  startTime: string,
  endTime: string,
  ownerId = employeeId
) {
  return request(app)
    .post("/api/shifts")
    .set("Authorization", `Bearer ${managerToken}`)
    .send({
      employeeId: ownerId,
      date,
      startTime,
      endTime
    });
}

test("Prekrivanje z osnutkom in objavljeno izmeno vrne 409", async () => {
  const date = "2031-05-01";

  const created = await postShift(date, "08:00", "16:00")
    .expect(201);

  for (const status of [ShiftStatus.DRAFT, ShiftStatus.PUBLISHED]) {
    await prisma.shift.update({
      where: { id: created.body.shift.id },
      data: { status }
    });

    for (const [start, end] of [
      ["08:00", "16:00"],
      ["07:00", "09:00"],
      ["15:00", "17:00"],
      ["09:00", "12:00"],
      ["07:00", "17:00"]
    ]) {
      const response = await postShift(date, start, end)
        .expect(409);

      assert.equal(
        response.body.message,
        "Zaposleni ima v izbranem času že dodeljeno izmeno."
      );
    }
  }

  const count = await prisma.shift.count({
    where: {
      employeeId,
      date: toDatabaseDate(date)
    }
  });

  assert.equal(count, 1);
});

test("Stični izmeni sta dovoljeni", async () => {
  const date = "2031-05-02";

  await postShift(date, "08:00", "16:00").expect(201);
  await postShift(date, "16:00", "20:00").expect(201);
  await postShift(date, "06:00", "08:00").expect(201);
});

test("Isti čas je dovoljen drugemu zaposlenemu ali drug dan", async () => {
  await postShift("2031-05-03", "08:00", "16:00").expect(201);

  await postShift(
    "2031-05-03",
    "08:00",
    "16:00",
    otherEmployeeId
  ).expect(201);

  await postShift("2031-05-04", "08:00", "16:00").expect(201);
});

test("Sočasni zahtevi ustvarita največ eno prekrivajočo izmeno", async () => {
  const date = "2031-05-05";

  const responses = await Promise.all([
    postShift(date, "08:00", "16:00"),
    postShift(date, "09:00", "17:00")
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409]
  );

  const count = await prisma.shift.count({
    where: {
      employeeId,
      date: toDatabaseDate(date)
    }
  });

  assert.equal(count, 1);
});

test("Baza zavrne prekrivanje tudi mimo API-ja", async () => {
  const date = "2031-05-06";

  await postShift(date, "08:00", "16:00").expect(201);

  await assert.rejects(
    () =>
      prisma.shift.create({
        data: {
          employeeId,
          date: toDatabaseDate(date),
          startTime: toDatabaseTime("10:00"),
          endTime: toDatabaseTime("12:00"),
          status: ShiftStatus.DRAFT
        }
      }),
    (error: unknown) => isShiftOverlapError(error)
  );
});

after(async () => {
  try {
    await prisma.shift.deleteMany({
      where: { employeeId: { in: userIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  } finally {
    await prisma.$disconnect();
  }
});