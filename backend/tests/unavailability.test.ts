import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { prisma } from "../src/lib/prisma.js";
import { Role } from "../src/generated/prisma/enums.js";
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
const entryIds: string[] = [];

let employeeId: string;
let otherEmployeeId: string;
let employeeToken: string;
let otherEmployeeToken: string;
let managerToken: string;

const validInput = {
  date: "2030-04-08",
  startTime: "09:00",
  endTime: "12:00"
};

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

  const employee = await createUser("availability", Role.EMPLOYEE);
  const other = await createUser("other-availability", Role.EMPLOYEE);
  const manager = await createUser("availability-manager", Role.MANAGER);

  employeeId = employee.id;
  otherEmployeeId = other.id;
  employeeToken = issueToken(employee.id);
  otherEmployeeToken = issueToken(other.id);
  managerToken = issueToken(manager.id);
});

async function createEntry(
  ownerId: string,
  date = validInput.date
) {
  const entry = await prisma.unavailability.create({
    data: {
      employeeId: ownerId,
      date: toDatabaseDate(date),
      startTime: toDatabaseTime(validInput.startTime),
      endTime: toDatabaseTime(validInput.endTime)
    }
  });

  entryIds.push(entry.id);
  return entry;
}

test("Nerazpoložljivost zahteva prijavo in vlogo zaposlenega", async () => {
  const operations = [
    { method: "get", path: "/api/me/unavailability" },
    { method: "post", path: "/api/me/unavailability" },
    {
      method: "delete",
      path: `/api/me/unavailability/${randomUUID()}`
    }
  ] as const;

  for (const operation of operations) {
    await request(app)[operation.method](operation.path)
      .expect(401);

    await request(app)[operation.method](operation.path)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(403);
  }
});

test("Zaposleni ustvari lastno nerazpoložljivost", async () => {
  const response = await request(app)
    .post("/api/me/unavailability")
    .set("Authorization", `Bearer ${employeeToken}`)
    .send(validInput)
    .expect(201);

  const entry = response.body.unavailability;
  assert.equal(typeof entry.id, "string");
  entryIds.push(entry.id);

  assert.deepEqual(entry, {
    id: entry.id,
    ...validInput
  });

  const stored = await prisma.unavailability.findUniqueOrThrow({
    where: { id: entry.id }
  });

  assert.equal(stored.employeeId, employeeId);
});

test("Neveljavni podatki in izbira drugega zaposlenega so zavrnjeni", async () => {
  const invalidInputs = [
    { ...validInput, endTime: "09:00" },
    { ...validInput, endTime: "08:00" },
    { ...validInput, startTime: "24:00" },
    { ...validInput, endTime: "12:60" },
    { ...validInput, date: "2030-02-30" },
    { ...validInput, date: "invalid" },
    { date: validInput.date, startTime: "09:00" },
    { ...validInput, employeeId: otherEmployeeId }
  ];

  const countBefore = await prisma.unavailability.count({
    where: { employeeId }
  });

  for (const input of invalidInputs) {
    await request(app)
      .post("/api/me/unavailability")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send(input)
      .expect(400);
  }

  const countAfter = await prisma.unavailability.count({
    where: { employeeId }
  });

  assert.equal(countAfter, countBefore);
});

test("Pregled vrne samo lastne vnose v pravilnem vrstnem redu", async () => {
  const later = await createEntry(employeeId, "2030-04-10");
  const earlier = await createEntry(employeeId, "2030-04-07");
  const foreign = await createEntry(otherEmployeeId);

  const response = await request(app)
    .get("/api/me/unavailability")
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(200);

  const entries = response.body.unavailabilities;
  const ids = entries.map((entry: { id: string }) => entry.id);

  assert.ok(ids.includes(later.id));
  assert.ok(ids.includes(earlier.id));
  assert.equal(ids.includes(foreign.id), false);

  const ownEntries = await prisma.unavailability.findMany({
    where: { employeeId },
    orderBy: [
      { date: "asc" },
      { startTime: "asc" },
      { id: "asc" }
    ]
  });

  assert.deepEqual(
    ids,
    ownEntries.map((entry) => entry.id)
  );

  for (const entry of entries) {
    assert.deepEqual(
      Object.keys(entry).sort(),
      ["id", "date", "startTime", "endTime"].sort()
    );
  }

  const otherResponse = await request(app)
    .get("/api/me/unavailability")
    .set("Authorization", `Bearer ${otherEmployeeToken}`)
    .expect(200);

  assert.deepEqual(
    otherResponse.body.unavailabilities.map(
      (entry: { id: string }) => entry.id
    ),
    [foreign.id]
  );
});

test("Lastni vnos je mogoče izbrisati", async () => {
  const entry = await createEntry(employeeId);

  await request(app)
    .delete(`/api/me/unavailability/${entry.id}`)
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(204);

  const stored = await prisma.unavailability.findUnique({
    where: { id: entry.id }
  });

  assert.equal(stored, null);

  await request(app)
    .delete(`/api/me/unavailability/${entry.id}`)
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(404);
});

test("Tujega vnosa ni mogoče izbrisati", async () => {
  const foreign = await createEntry(otherEmployeeId);

  await request(app)
    .delete(`/api/me/unavailability/${foreign.id}`)
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(404);

  const stored = await prisma.unavailability.findUnique({
    where: { id: foreign.id }
  });

  assert.ok(stored);
  assert.equal(stored.employeeId, otherEmployeeId);

  await request(app)
    .delete(`/api/me/unavailability/${randomUUID()}`)
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(404);

  await request(app)
    .delete("/api/me/unavailability/invalid")
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(400);
});

after(async () => {
  try {
    await prisma.unavailability.deleteMany({
      where: { id: { in: entryIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  } finally {
    await prisma.$disconnect();
  }
});