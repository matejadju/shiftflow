import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { prisma } from "../src/lib/prisma.js";
import {
  Role,
  ShiftStatus,
  SwapStatus
} from "../src/generated/prisma/enums.js";
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

let requesterId: string;
let recipientId: string;
let outsiderId: string;
let managerId: string;

let requesterToken: string;
let recipientToken: string;
let outsiderToken: string;
let managerToken: string;

let day = 0;

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
        lastName: "SwapTest",
        email: `${name}-${suffix}@example.com`,
        passwordHash,
        role
      }
    });

    userIds.push(user.id);
    return user;
  }

  const requester = await createUser("requester", Role.EMPLOYEE);
  const recipient = await createUser("recipient", Role.EMPLOYEE);
  const outsider = await createUser("outsider", Role.EMPLOYEE);
  const manager = await createUser("swap-manager", Role.MANAGER);

  requesterId = requester.id;
  recipientId = recipient.id;
  outsiderId = outsider.id;
  managerId = manager.id;

  requesterToken = issueToken(requester.id);
  recipientToken = issueToken(recipient.id);
  outsiderToken = issueToken(outsider.id);
  managerToken = issueToken(manager.id);
});

async function createShift(
  ownerId = requesterId,
  status: ShiftStatus = ShiftStatus.PUBLISHED
) {
  day += 1;
  const date = `2032-01-${String(day).padStart(2, "0")}`;

  const shift = await prisma.shift.create({
    data: {
      employeeId: ownerId,
      date: toDatabaseDate(date),
      startTime: toDatabaseTime("08:00"),
      endTime: toDatabaseTime("16:00"),
      status
    }
  });

  shiftIds.push(shift.id);
  return shift;
}

function sendRequest(
  shiftId: string,
  targetId = recipientId,
  token = requesterToken
) {
  return request(app)
    .post("/api/swap-requests")
    .set("Authorization", `Bearer ${token}`)
    .send({
      shiftId,
      recipientId: targetId
    });
}

test("Poti zahtevajo prijavo in vlogo zaposlenega", async () => {
  const operations = [
    { method: "post", path: "/api/swap-requests" },
    { method: "get", path: "/api/swap-requests" },
    { method: "get", path: "/api/swap-requests/recipients" }
  ] as const;

  for (const operation of operations) {
    await request(app)[operation.method](operation.path)
      .expect(401);

    await request(app)[operation.method](operation.path)
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(403);
  }
});

test("Izbor prevzemnika vključuje samo druge zaposlene", async () => {
  const response = await request(app)
    .get("/api/swap-requests/recipients")
    .set("Authorization", `Bearer ${requesterToken}`)
    .expect(200);

  const employees = response.body.employees;
  const ids = employees.map((employee: { id: string }) => employee.id);

  assert.ok(ids.includes(recipientId));
  assert.equal(ids.includes(requesterId), false);
  assert.equal(ids.includes(managerId), false);

  for (const employee of employees) {
    assert.deepEqual(
      Object.keys(employee).sort(),
      ["id", "firstName", "lastName"].sort()
    );
  }
});

test("Zahteva za lastno objavljeno izmeno dobi status PENDING", async () => {
  const shift = await createShift();

  const response = await sendRequest(shift.id).expect(201);
  const entry = response.body.swapRequest;

  assert.equal(entry.shiftId, shift.id);
  assert.equal(entry.requesterId, requesterId);
  assert.equal(entry.recipientId, recipientId);
  assert.equal(entry.status, "PENDING");

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: entry.id }
  });

  assert.equal(stored.status, SwapStatus.PENDING);

  const unchanged = await prisma.shift.findUniqueOrThrow({
    where: { id: shift.id }
  });

  assert.equal(unchanged.employeeId, requesterId);
});

test("Tuja, neobjavljena in neobstoječa izmena so zavrnjene", async () => {
  const foreign = await createShift(outsiderId);
  const draft = await createShift(requesterId, ShiftStatus.DRAFT);

  await sendRequest(foreign.id).expect(404);
  await sendRequest(draft.id).expect(400);
  await sendRequest(randomUUID()).expect(404);
});

test("Neveljavni podatki in neustrezen prevzemnik so zavrnjeni", async () => {
  const shift = await createShift();

  await sendRequest(shift.id, requesterId).expect(400);
  await sendRequest(shift.id, managerId).expect(400);
  await sendRequest(shift.id, randomUUID()).expect(400);

  for (const body of [
    {},
    { shiftId: "invalid", recipientId },
    { shiftId: shift.id, recipientId: "invalid" },
    {
      shiftId: shift.id,
      recipientId,
      requesterId: outsiderId
    }
  ]) {
    await request(app)
      .post("/api/swap-requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(body)
      .expect(400);
  }
});

test("Odprta zahteva blokira novo, zavrnjena pa jo dovoljuje", async () => {
  const shift = await createShift();

  const created = await sendRequest(shift.id).expect(201);
  const id = created.body.swapRequest.id;

  await sendRequest(shift.id).expect(409);

  await prisma.swapRequest.update({
    where: { id },
    data: { status: SwapStatus.ACCEPTED }
  });

  await sendRequest(shift.id).expect(409);

  await prisma.swapRequest.update({
    where: { id },
    data: { status: SwapStatus.REJECTED }
  });

  await sendRequest(shift.id).expect(201);
});

test("Sočasna oddaja ustvari samo eno odprto zahtevo", async () => {
  const shift = await createShift();

  const responses = await Promise.all([
    sendRequest(shift.id),
    sendRequest(shift.id)
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409]
  );

  const count = await prisma.swapRequest.count({
    where: {
      shiftId: shift.id,
      status: {
        in: [SwapStatus.PENDING, SwapStatus.ACCEPTED]
      }
    }
  });

  assert.equal(count, 1);
});

test("Zahtevo vidita udeleženca, drugi zaposleni pa ne", async () => {
  const shift = await createShift();
  const created = await sendRequest(shift.id).expect(201);
  const id = created.body.swapRequest.id;

  for (const token of [requesterToken, recipientToken]) {
    const response = await request(app)
      .get("/api/swap-requests")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const entries = response.body.swapRequests;
    const entry = entries.find(
      (item: { id: string }) => item.id === id
    );

    assert.ok(entry);
    assert.equal(entry.status, "PENDING");
    assert.equal(entry.requester.id, requesterId);
    assert.equal(entry.recipient.id, recipientId);
    assert.equal(entry.shift.date, shift.date.toISOString().slice(0, 10));
    assert.equal(entry.shift.startTime, "08:00");
    assert.equal(entry.shift.endTime, "16:00");

    for (const item of entries) {
      assert.ok(
        item.requester.id === entry.requester.id ||
        item.recipient.id === entry.recipient.id
      );

      for (const person of [item.requester, item.recipient]) {
        assert.deepEqual(
          Object.keys(person).sort(),
          ["id", "firstName", "lastName"].sort()
        );
      }
    }
  }

  const outsider = await request(app)
    .get("/api/swap-requests")
    .set("Authorization", `Bearer ${outsiderToken}`)
    .expect(200);

  assert.deepEqual(outsider.body.swapRequests, []);
});

async function createPendingRequest() {
  const shift = await createShift();
  const response = await sendRequest(shift.id).expect(201);

  return {
    shiftId: shift.id,
    requestId: response.body.swapRequest.id as string
  };
}

function respondToRequest(
  id: string,
  decision: string,
  token = recipientToken
) {
  return request(app)
    .patch(`/api/swap-requests/${id}/respond`)
    .set("Authorization", `Bearer ${token}`)
    .send({ decision });
}

test("Odgovor na zahtevo zahteva prijavo in vlogo zaposlenega", async () => {
  const { requestId } = await createPendingRequest();

  await request(app)
    .patch(`/api/swap-requests/${requestId}/respond`)
    .send({ decision: "ACCEPT" })
    .expect(401);

  await respondToRequest(requestId, "ACCEPT", managerToken)
    .expect(403);

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  assert.equal(stored.status, SwapStatus.PENDING);
});

test("Prevzemnik sprejme zahtevo brez spremembe urnika", async () => {
  const { requestId, shiftId } = await createPendingRequest();

  const response = await respondToRequest(requestId, "ACCEPT")
    .expect(200);

  assert.deepEqual(response.body, {
    swapRequest: {
      id: requestId,
      status: "ACCEPTED"
    }
  });

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  assert.equal(stored.status, SwapStatus.ACCEPTED);

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId }
  });

  assert.equal(shift.employeeId, requesterId);

  for (const token of [requesterToken, recipientToken]) {
    const overview = await request(app)
      .get("/api/swap-requests")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const entry = overview.body.swapRequests.find(
      (item: { id: string }) => item.id === requestId
    );

    assert.ok(entry);
    assert.equal(entry.status, "ACCEPTED");
  }
});

test("Prevzemnik zavrne zahtevo brez spremembe urnika", async () => {
  const { requestId, shiftId } = await createPendingRequest();

  const response = await respondToRequest(requestId, "REJECT")
    .expect(200);

  assert.equal(response.body.swapRequest.status, "REJECTED");

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  assert.equal(stored.status, SwapStatus.REJECTED);

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId }
  });

  assert.equal(shift.employeeId, requesterId);
});

test("Predlagatelj in drugi zaposleni ne moreta odgovoriti", async () => {
  const { requestId } = await createPendingRequest();

  for (const token of [requesterToken, outsiderToken]) {
    await respondToRequest(requestId, "ACCEPT", token)
      .expect(404);

    await respondToRequest(requestId, "REJECT", token)
      .expect(404);
  }

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  assert.equal(stored.status, SwapStatus.PENDING);
});

test("Na zahtevo zunaj stanja PENDING ni mogoče odgovoriti", async () => {
  for (const status of [
    SwapStatus.ACCEPTED,
    SwapStatus.REJECTED,
    SwapStatus.APPROVED
  ]) {
    const { requestId } = await createPendingRequest();

    await prisma.swapRequest.update({
      where: { id: requestId },
      data: { status }
    });

    await respondToRequest(requestId, "ACCEPT").expect(409);
    await respondToRequest(requestId, "REJECT").expect(409);

    const stored = await prisma.swapRequest.findUniqueOrThrow({
      where: { id: requestId }
    });

    assert.equal(stored.status, status);
  }
});

test("Neveljavna odločitev in neobstoječa zahteva sta zavrnjeni", async () => {
  const { requestId } = await createPendingRequest();

  for (const body of [
    {},
    { decision: "APPROVE" },
    { decision: "accept" },
    { decision: "ACCEPT", recipientId: outsiderId }
  ]) {
    await request(app)
      .patch(`/api/swap-requests/${requestId}/respond`)
      .set("Authorization", `Bearer ${recipientToken}`)
      .send(body)
      .expect(400);
  }

  await respondToRequest("invalid", "ACCEPT").expect(400);
  await respondToRequest(randomUUID(), "ACCEPT").expect(404);

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  assert.equal(stored.status, SwapStatus.PENDING);
});

test("Ob sočasnem sprejemu in zavrnitvi uspe samo en odgovor", async () => {
  const { requestId, shiftId } = await createPendingRequest();

  const responses = await Promise.all([
    respondToRequest(requestId, "ACCEPT"),
    respondToRequest(requestId, "REJECT")
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409]
  );

  const winner = responses.find((response) => response.status === 200);
  assert.ok(winner);

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  assert.equal(stored.status, winner.body.swapRequest.status);

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId }
  });

  assert.equal(shift.employeeId, requesterId);
});

after(async () => {
  try {
    await prisma.swapRequest.deleteMany({
      where: { shiftId: { in: shiftIds } }
    });

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