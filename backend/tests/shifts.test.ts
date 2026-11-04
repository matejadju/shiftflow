import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { prisma } from "../src/lib/prisma.js";

assert.equal(
  new URL(config.DATABASE_URL).pathname,
  "/shiftflow_api_test",
  "Teste izmen zaženite samo na bazi shiftflow_api_test."
);

const app = createApp(config.FRONTEND_URL);
const createdIds: string[] = [];

let managerToken: string;
let employeeToken: string;
let employeeId: string;
let managerId: string;

const weekStart = "2030-01-07";
const nextWeekStart = "2030-01-14";

before(async () => {
  const password = process.env.SEED_PASSWORD;
  assert.ok(password, "Manjka SEED_PASSWORD.");

  async function login(email: string) {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);

    return response.body;
  }

  const manager = await login("maja.vodja@example.com");
  const employee = await login("ana.novak@example.com");

  managerToken = manager.token;
  managerId = manager.user.id;
  employeeToken = employee.token;
  employeeId = employee.user.id;
});

function shiftInput(date = weekStart) {
  return {
    employeeId,
    date,
    startTime: "08:00",
    endTime: "16:00"
  };
}

async function createShift(date = weekStart) {
  const response = await request(app)
    .post("/api/shifts")
    .set("Authorization", `Bearer ${managerToken}`)
    .send(shiftInput(date))
    .expect(201);

  createdIds.push(response.body.shift.id);
  return response.body.shift;
}

test("Poti izmen zahtevajo prijavo in vlogo vodje", async () => {
  const operations = [
    { method: "get", path: `/api/shifts?weekStart=${weekStart}` },
    { method: "get", path: "/api/shifts/employees" },
    { method: "post", path: "/api/shifts" },
    { method: "post", path: "/api/shifts/publish" }
  ] as const;

  for (const operation of operations) {
    await request(app)[operation.method](operation.path).expect(401);

    await request(app)[operation.method](operation.path)
      .set("Authorization", `Bearer ${employeeToken}`)
      .expect(403);
  }
});

test("Seznam zaposlenih ne razkriva gesel ali vključuje vodje", async () => {
  const response = await request(app)
    .get("/api/shifts/employees")
    .set("Authorization", `Bearer ${managerToken}`)
    .expect(200);

  assert.ok(
    response.body.employees.some(
      (employee: { id: string }) => employee.id === employeeId
    )
  );

  assert.equal(
    response.body.employees.some(
      (employee: { id: string }) => employee.id === managerId
    ),
    false
  );

  for (const employee of response.body.employees) {
    assert.deepEqual(
      Object.keys(employee).sort(),
      ["id", "firstName", "lastName", "email"].sort()
    );
  }
});

test("Nova izmena je osnutek s pravilnim datumom in časom", async () => {
  const shift = await createShift();

  assert.equal(shift.status, "DRAFT");
  assert.equal(shift.employeeId, employeeId);
  assert.equal(shift.date, weekStart);
  assert.equal(shift.startTime, "08:00");
  assert.equal(shift.endTime, "16:00");
  assert.equal("passwordHash" in shift.employee, false);
});

test("Neveljavni intervali, datumi in zaposleni so zavrnjeni", async () => {
  const invalidInputs = [
    { ...shiftInput(), endTime: "08:00" },
    { ...shiftInput(), endTime: "07:00" },
    { ...shiftInput(), startTime: "25:00" },
    { ...shiftInput(), date: "2030-02-30" },
    { ...shiftInput(), employeeId: "invalid" },
    { ...shiftInput(), employeeId: randomUUID() },
    { ...shiftInput(), employeeId: managerId },
    { ...shiftInput(), status: "PUBLISHED" }
  ];

  for (const input of invalidInputs) {
    await request(app)
      .post("/api/shifts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send(input)
      .expect(400);
  }
});

test("Pregled in objava zahtevata veljaven ponedeljek", async () => {
  for (const value of ["2030-01-08", "2030-02-30", "invalid"]) {
    await request(app)
      .get("/api/shifts")
      .query({ weekStart: value })
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(400);

    await request(app)
      .post("/api/shifts/publish")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ weekStart: value })
      .expect(400);
  }
});

test("Tedenski pregled in objava upoštevata meje tedna", async () => {
  const monday = await createShift();
  const sunday = await createShift("2030-01-13");
  const nextMonday = await createShift(nextWeekStart);

  const overview = await request(app)
    .get("/api/shifts")
    .query({ weekStart })
    .set("Authorization", `Bearer ${managerToken}`)
    .expect(200);

  const ids = overview.body.shifts.map(
    (shift: { id: string }) => shift.id
  );

  assert.ok(ids.includes(monday.id));
  assert.ok(ids.includes(sunday.id));
  assert.equal(ids.includes(nextMonday.id), false);

  const published = await request(app)
    .post("/api/shifts/publish")
    .set("Authorization", `Bearer ${managerToken}`)
    .send({ weekStart })
    .expect(200);

  assert.ok(published.body.publishedCount >= 2);

  for (const id of [monday.id, sunday.id]) {
    const shift = await prisma.shift.findUniqueOrThrow({
      where: { id }
    });
    assert.equal(shift.status, "PUBLISHED");
  }

  const untouched = await prisma.shift.findUniqueOrThrow({
    where: { id: nextMonday.id }
  });
  assert.equal(untouched.status, "DRAFT");

  const repeated = await request(app)
    .post("/api/shifts/publish")
    .set("Authorization", `Bearer ${managerToken}`)
    .send({ weekStart })
    .expect(200);

  assert.equal(repeated.body.publishedCount, 0);
});

after(async () => {
  try {
    await prisma.shift.deleteMany({
      where: { id: { in: createdIds } }
    });
  } finally {
    await prisma.$disconnect();
  }
});