import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Role } from "../src/generated/prisma/enums.js";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const password = process.env.SEED_PASSWORD;

  if (!connectionString) {
    throw new Error("Manjka okoljska spremenljivka DATABASE_URL.");
  }

  if (!password || password.length < 12) {
    throw new Error("SEED_PASSWORD mora vsebovati vsaj 12 znakov.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const users = [
      {
        firstName: "Maja",
        lastName: "Vodja",
        email: "maja.vodja@example.com",
        role: Role.MANAGER
      },
      {
        firstName: "Ana",
        lastName: "Novak",
        email: "ana.novak@example.com",
        role: Role.EMPLOYEE
      },
      {
        firstName: "Luka",
        lastName: "Kovac",
        email: "luka.kovac@example.com",
        role: Role.EMPLOYEE
      }
    ];

    await prisma.$transaction(
      users.map((user) =>
        prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            ...user,
            passwordHash
          }
        })
      )
    );

    console.log("Začetni uporabniki so pripravljeni:");

    for (const user of users) {
      console.log(`- ${user.email} (${user.role})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Vnos začetnih podatkov ni uspel:", error);
  process.exitCode = 1;
});