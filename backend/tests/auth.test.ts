import assert from "node:assert/strict";
import { after, test } from "node:test";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { prisma } from "../src/lib/prisma.js";
import { Role } from "../src/generated/prisma/enums.js";
import {
  requireAuth,
  requireRole
} from "../src/middleware/auth.js";

const app = createApp(config.FRONTEND_URL);
const password = process.env.SEED_PASSWORD;

assert.ok(password, "Za teste nastavite SEED_PASSWORD.");

// Ločena testna aplikacija preverja middleware brez dodajanja
// testnih endpointov v dejansko aplikacijo.
const roleApp = express();

roleApp.get(
  "/manager",
  requireAuth,
  requireRole(Role.MANAGER),
  (_req, res) => {
    res.json({ message: "Dostop dovoljen." });
  }
);

async function login(email: string) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);

  assert.equal(typeof response.body.token, "string");

  return response.body;
}

test("Veljavna prijava in dostop do lastnih podatkov", async () => {
  const result = await login("ana.novak@example.com");

  assert.equal(result.user.role, "EMPLOYEE");
  assert.deepEqual(
    Object.keys(result.user).sort(),
    ["id", "firstName", "lastName", "email", "role"].sort()
  );

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${result.token}`)
    .expect(200);

  assert.deepEqual(response.body.user, result.user);
});

test("Napačno geslo in neobstoječ uporabnik vrneta isto napako", async () => {
  const wrongPassword = await request(app)
    .post("/api/auth/login")
    .send({
      email: "ana.novak@example.com",
      password: `${password}-wrong`
    })
    .expect(401);

  const unknownUser = await request(app)
    .post("/api/auth/login")
    .send({
      email: "unknown@example.com",
      password
    })
    .expect(401);

  assert.deepEqual(wrongPassword.body, unknownUser.body);
  assert.equal("token" in wrongPassword.body, false);
});

test("Neveljavni prijavni podatki vrnejo 400", async () => {
  await request(app)
    .post("/api/auth/login")
    .send({ email: "invalid", password: "" })
    .expect(400);
});

test("Manjkajoč ali neveljaven žeton onemogoči dostop", async () => {
  await request(app)
    .get("/api/auth/me")
    .expect(401);

  await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer invalid-token")
    .expect(401);
});

test("Potekel žeton onemogoči dostop", async () => {
  const result = await login("ana.novak@example.com");

  const expiredToken = jwt.sign({}, config.JWT_SECRET, {
    algorithm: "HS256",
    subject: result.user.id,
    expiresIn: -1,
    issuer: "shiftflow-api",
    audience: "shiftflow-web"
  });

  await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${expiredToken}`)
    .expect(401);
});

test("Žeton z napačnim podpisom onemogoči dostop", async () => {
  const result = await login("ana.novak@example.com");

  const forgedToken = jwt.sign(
    {},
    `${config.JWT_SECRET}-different`,
    {
      algorithm: "HS256",
      subject: result.user.id,
      expiresIn: "1h",
      issuer: "shiftflow-api",
      audience: "shiftflow-web"
    }
  );

  await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${forgedToken}`)
    .expect(401);
});

test("Samo vodja lahko dostopa do poti za vodjo", async () => {
  await request(roleApp)
    .get("/manager")
    .expect(401);

  const employee = await login("ana.novak@example.com");

  await request(roleApp)
    .get("/manager")
    .set("Authorization", `Bearer ${employee.token}`)
    .expect(403);

  const manager = await login("maja.vodja@example.com");

  await request(roleApp)
    .get("/manager")
    .set("Authorization", `Bearer ${manager.token}`)
    .expect(200);
});

after(async () => {
  await prisma.$disconnect();
});