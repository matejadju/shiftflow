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

let requesterId: string;
let recipientId: string;
let otherId: string;
let managerToken: string;
let employeeToken: string;

let day = 0;

before(async () => {
  const suffix = randomUUID();
  const passwordHash = await bcrypt.hash(randomUUID(), 4);

  async function createUser(name: string, role: Role) {
    const user = await prisma.user.create({
      data: {
        firstName: name,
        lastName: "ApprovalTest",
        email: `${name}-${suffix}@example.com`,
        passwordHash,
        role
      }
    });

    userIds.push(user.id);
    return user;
  }

  const requester = await createUser("approval-requester", Role.EMPLOYEE);
  const recipient = await createUser("approval-recipient", Role.EMPLOYEE);
  const other = await createUser("approval-other", Role.EMPLOYEE);
  const manager = await createUser("approval-manager", Role.MANAGER);

  requesterId = requester.id;
  recipientId = recipient.id;
  otherId = other.id;

  function token(id: string) {
    return jwt.sign({}, config.JWT_SECRET, {
      algorithm: "HS256",
      subject: id,
      expiresIn: "1h",
      issuer: "shiftflow-api",
      audience: "shiftflow-web"
    });
  }

  managerToken = token(manager.id);
  employeeToken = token(requester.id);
});

async function createFixture(
  status: SwapStatus = SwapStatus.ACCEPTED
) {
  day += 1;
  const date = `2033-01-${String(day).padStart(2, "0")}`;

  const shift = await prisma.shift.create({
    data: {
      employeeId: requesterId,
      date: toDatabaseDate(date),
      startTime: toDatabaseTime("08:00"),
      endTime: toDatabaseTime("16:00"),
      status: ShiftStatus.PUBLISHED
    }
  });

  const entry = await prisma.swapRequest.create({
    data: {
      shiftId: shift.id,
      requesterId,
      recipientId,
      status
    }
  });

  return { shift, entry };
}

function decide(
  id: string,
  decision: string,
  token = managerToken
) {
  return request(app)
    .patch(`/api/manager/swap-requests/${id}/decision`)
    .set("Authorization", `Bearer ${token}`)
    .send({ decision });
}

async function assertState(
  requestId: string,
  shiftId: string,
  status: SwapStatus,
  ownerId: string
) {
  const entry = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: requestId }
  });

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: shiftId }
  });

  assert.equal(entry.status, status);
  assert.equal(shift.employeeId, ownerId);
  assert.equal(shift.status, ShiftStatus.PUBLISHED);
}

test("Pregled in odločanje zahtevata prijavo in vlogo vodje", async () => {
  const { entry } = await createFixture();

  await request(app)
    .get("/api/manager/swap-requests")
    .expect(401);

  await request(app)
    .get("/api/manager/swap-requests")
    .set("Authorization", `Bearer ${employeeToken}`)
    .expect(403);

  await request(app)
    .patch(`/api/manager/swap-requests/${entry.id}/decision`)
    .send({ decision: "APPROVE" })
    .expect(401);

  await decide(entry.id, "APPROVE", employeeToken).expect(403);
});

test("Pregled vodje vključuje samo sprejete zahteve", async () => {
  const accepted = await createFixture();
  const pending = await createFixture(SwapStatus.PENDING);
  const rejected = await createFixture(SwapStatus.REJECTED);

  const response = await request(app)
    .get("/api/manager/swap-requests")
    .set("Authorization", `Bearer ${managerToken}`)
    .expect(200);

  const entries = response.body.swapRequests;
  const ids = entries.map((entry: { id: string }) => entry.id);

  assert.ok(ids.includes(accepted.entry.id));
  assert.equal(ids.includes(pending.entry.id), false);
  assert.equal(ids.includes(rejected.entry.id), false);

  for (const entry of entries) {
    assert.equal(entry.status, "ACCEPTED");

    for (const person of [entry.requester, entry.recipient]) {
      assert.deepEqual(
        Object.keys(person).sort(),
        ["id", "firstName", "lastName"].sort()
      );
    }
  }
});

test("Potrditev spremeni dodelitev in status zahteve", async () => {
  const { shift, entry } = await createFixture();

  const response = await decide(entry.id, "APPROVE").expect(200);

  assert.deepEqual(response.body, {
    swapRequest: {
      id: entry.id,
      status: "APPROVED"
    }
  });

  await assertState(
    entry.id,
    shift.id,
    SwapStatus.APPROVED,
    recipientId
  );
});

test("Zavrnitev spremeni samo status zahteve", async () => {
  const { shift, entry } = await createFixture();

  await decide(entry.id, "REJECT").expect(200);

  await assertState(
    entry.id,
    shift.id,
    SwapStatus.REJECTED,
    requesterId
  );
});

test("Neveljavne in že obravnavane zahteve so zavrnjene", async () => {
  const { entry } = await createFixture();

  await decide("invalid", "APPROVE").expect(400);
  await decide(randomUUID(), "APPROVE").expect(404);
  await decide(entry.id, "ACCEPT").expect(400);

  for (const status of [
    SwapStatus.PENDING,
    SwapStatus.REJECTED,
    SwapStatus.APPROVED
  ]) {
    const fixture = await createFixture(status);

    await decide(fixture.entry.id, "APPROVE").expect(409);
    await decide(fixture.entry.id, "REJECT").expect(409);

    await assertState(
      fixture.entry.id,
      fixture.shift.id,
      status,
      requesterId
    );
  }
});

test("Prekrivanje z osnutkom ali objavljeno izmeno blokira potrditev", async () => {
  for (const status of [ShiftStatus.DRAFT, ShiftStatus.PUBLISHED]) {
    const { shift, entry } = await createFixture();

    await prisma.shift.create({
      data: {
        employeeId: recipientId,
        date: shift.date,
        startTime: toDatabaseTime("15:00"),
        endTime: toDatabaseTime("18:00"),
        status
      }
    });

    const response = await decide(entry.id, "APPROVE")
      .expect(409);

    assert.equal(
      response.body.message,
      "Prevzemnik ima v tem času že dodeljeno izmeno."
    );

    await assertState(
      entry.id,
      shift.id,
      SwapStatus.ACCEPTED,
      requesterId
    );
  }
});

test("Nerazpoložljivost prevzemnika blokira potrditev", async () => {
  const { shift, entry } = await createFixture();

  await prisma.unavailability.create({
    data: {
      employeeId: recipientId,
      date: shift.date,
      startTime: toDatabaseTime("10:00"),
      endTime: toDatabaseTime("12:00")
    }
  });

  const response = await decide(entry.id, "APPROVE").expect(409);

  assert.equal(
    response.body.message,
    "Prevzemnik je v izbranem času nerazpoložljiv."
  );

  await assertState(
    entry.id,
    shift.id,
    SwapStatus.ACCEPTED,
    requesterId
  );
});

test("Stični intervali ne blokirajo potrditve", async () => {
  const { shift, entry } = await createFixture();

  await prisma.shift.create({
    data: {
      employeeId: recipientId,
      date: shift.date,
      startTime: toDatabaseTime("06:00"),
      endTime: toDatabaseTime("08:00"),
      status: ShiftStatus.PUBLISHED
    }
  });

  await prisma.unavailability.create({
    data: {
      employeeId: recipientId,
      date: shift.date,
      startTime: toDatabaseTime("16:00"),
      endTime: toDatabaseTime("18:00")
    }
  });

  await decide(entry.id, "APPROVE").expect(200);

  await assertState(
    entry.id,
    shift.id,
    SwapStatus.APPROVED,
    recipientId
  );
});

test("Promenjeno lastništvo ali osnutek blokirata potrditev", async () => {
  const changedOwner = await createFixture();

  await prisma.shift.update({
    where: { id: changedOwner.shift.id },
    data: { employeeId: otherId }
  });

  await decide(changedOwner.entry.id, "APPROVE").expect(409);

  await assertState(
    changedOwner.entry.id,
    changedOwner.shift.id,
    SwapStatus.ACCEPTED,
    otherId
  );

  const draft = await createFixture();

  await prisma.shift.update({
    where: { id: draft.shift.id },
    data: { status: ShiftStatus.DRAFT }
  });

  await decide(draft.entry.id, "APPROVE").expect(409);

  const stored = await prisma.swapRequest.findUniqueOrThrow({
    where: { id: draft.entry.id }
  });

  const shift = await prisma.shift.findUniqueOrThrow({
    where: { id: draft.shift.id }
  });

  assert.equal(stored.status, SwapStatus.ACCEPTED);
  assert.equal(shift.employeeId, requesterId);
  assert.equal(shift.status, ShiftStatus.DRAFT);
});

test("Prevzemnik brez vloge zaposlenega ne more prevzeti izmene", async () => {
  const { shift, entry } = await createFixture();

  try {
    await prisma.user.update({
      where: { id: recipientId },
      data: { role: Role.MANAGER }
    });

    await decide(entry.id, "APPROVE").expect(409);

    await assertState(
      entry.id,
      shift.id,
      SwapStatus.ACCEPTED,
      requesterId
    );
  } finally {
    await prisma.user.update({
      where: { id: recipientId },
      data: { role: Role.EMPLOYEE }
    });
  }
});

test("Ob sočasni potrditvi in zavrnitvi uspe samo ena odločitev", async () => {
  const { shift, entry } = await createFixture();

  const responses = await Promise.all([
    decide(entry.id, "APPROVE"),
    decide(entry.id, "REJECT")
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409]
  );

  const winner = responses.find((response) => response.status === 200);
  assert.ok(winner);

  const status = winner.body.swapRequest.status;

  assert.ok(
    status === SwapStatus.APPROVED ||
    status === SwapStatus.REJECTED
  );

  await assertState(
    entry.id,
    shift.id,
    status,
    status === SwapStatus.APPROVED ? recipientId : requesterId
  );
});

test("Sočasni potrditvi ne dodelita prekrivajočih izmen prevzemniku", async () => {
  const first = await createFixture();

  const secondShift = await prisma.shift.create({
    data: {
      employeeId: otherId,
      date: first.shift.date,
      startTime: toDatabaseTime("09:00"),
      endTime: toDatabaseTime("17:00"),
      status: ShiftStatus.PUBLISHED
    }
  });

  const secondRequest = await prisma.swapRequest.create({
    data: {
      shiftId: secondShift.id,
      requesterId: otherId,
      recipientId,
      status: SwapStatus.ACCEPTED
    }
  });

  const responses = await Promise.all([
    decide(first.entry.id, "APPROVE"),
    decide(secondRequest.id, "APPROVE")
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409]
  );

  const fixtures = [
    {
      requestId: first.entry.id,
      shiftId: first.shift.id,
      originalOwner: requesterId
    },
    {
      requestId: secondRequest.id,
      shiftId: secondShift.id,
      originalOwner: otherId
    }
  ];

  for (const [index, fixture] of fixtures.entries()) {
    const succeeded = responses[index].status === 200;

    await assertState(
      fixture.requestId,
      fixture.shiftId,
      succeeded ? SwapStatus.APPROVED : SwapStatus.ACCEPTED,
      succeeded ? recipientId : fixture.originalOwner
    );
  }

  const recipientShifts = await prisma.shift.count({
    where: {
      employeeId: recipientId,
      date: first.shift.date
    }
  });

  assert.equal(recipientShifts, 1);
});

test("Napaka zadnjega upisa razveljavi tudi spremembo izmene", async () => {
  const { shift, entry } = await createFixture();

  // Vrednosti v spodnjem SQL so omejene na UUID iz testnih podatkov
  // in ime, sestavljeno iz znane predpone ter naključnih hex znakov.
  assert.match(entry.id, /^[0-9a-f-]{36}$/i);

  const constraintName =
    `test_approval_failure_${randomUUID().replaceAll("-", "")}`;

  // Samo za ta test preprečimo zadnji korak: status APPROVED.
  // Predhodna sprememba lastnika izmene mora biti razveljavljena.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SwapRequest"
    ADD CONSTRAINT "${constraintName}"
    CHECK (
      NOT (
        "id" = '${entry.id}'::uuid
        AND "status" = 'APPROVED'
      )
    )
  `);

  try {
    await decide(entry.id, "APPROVE").expect(500);

    await assertState(
      entry.id,
      shift.id,
      SwapStatus.ACCEPTED,
      requesterId
    );
  } finally {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SwapRequest"
      DROP CONSTRAINT "${constraintName}"
    `);
  }

  // Po odstranitvi testne ovire lahko ista zahteva uspe.
  await decide(entry.id, "APPROVE").expect(200);

  await assertState(
    entry.id,
    shift.id,
    SwapStatus.APPROVED,
    recipientId
  );
});

after(async () => {
  try {
    await prisma.swapRequest.deleteMany({
      where: {
        OR: [
          { requesterId: { in: userIds } },
          { recipientId: { in: userIds } }
        ]
      }
    });

    await prisma.unavailability.deleteMany({
      where: { employeeId: { in: userIds } }
    });

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