import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const password = process.env.SEED_PASSWORD;

  if (!connectionString || !password) {
    throw new Error("Manjka DATABASE_URL ali SEED_PASSWORD.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  try {
    const expectedUsers = [
      { email: "maja.vodja@example.com", role: "MANAGER" },
      { email: "ana.novak@example.com", role: "EMPLOYEE" },
      { email: "luka.kovac@example.com", role: "EMPLOYEE" }
    ];

    for (const expected of expectedUsers) {
      const user = await prisma.user.findUnique({
        where: { email: expected.email }
      });

      assert.ok(user, `Uporabnik ${expected.email} ne obstaja.`);
      assert.equal(user.role, expected.role, "Napačna uporabniška vloga.");
      assert.notEqual(user.passwordHash, password);
      assert.equal(bcrypt.getRounds(user.passwordHash), 12);
      assert.ok(
        await bcrypt.compare(password, user.passwordHash),
        `Geslo uporabnika ${expected.email} ne ustreza SEED_PASSWORD.`
      );

      console.log(`OK: ${expected.email} – vloga in bcrypt geslo.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Preverjanje začetnih podatkov ni uspelo:", error);
  process.exitCode = 1;
});