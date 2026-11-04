import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

async function start() {
  await prisma.$connect();

  const app = createApp(config.FRONTEND_URL);

  const server = app.listen(config.PORT, () => {
    console.log(
      `ShiftFlow API je dosegljiv na http://localhost:${config.PORT}`
    );
  });

  let shuttingDown = false;

  function shutdown() {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    const timeout = setTimeout(() => {
      console.error("Zaustavitev strežnika je trajala predolgo.");
      process.exit(1);
    }, 10_000);

    timeout.unref();

    server.close(() => {
      void prisma.$disconnect().then(
        () => {
          clearTimeout(timeout);
          process.exit(0);
        },
        () => {
          console.error("Zapiranje povezave z bazo ni uspelo.");
          process.exit(1);
        }
      );
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.on("error", () => {
    console.error("Zagon HTTP strežnika ni uspel.");
    void prisma.$disconnect().finally(() => process.exit(1));
  });
}

start().catch(() => {
  console.error(
    "Zagon aplikacije ni uspel. Preverite povezavo s podatkovno bazo."
  );

  void prisma.$disconnect().finally(() => process.exit(1));
});