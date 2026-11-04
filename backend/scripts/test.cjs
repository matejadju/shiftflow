require("dotenv/config");

const { spawnSync } = require("node:child_process");

function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Manjka DATABASE_URL.");
  }

  if (!process.env.SEED_PASSWORD) {
    throw new Error("Manjka SEED_PASSWORD.");
  }

  const testUrl = new URL(process.env.DATABASE_URL);
  testUrl.pathname = "/shiftflow_api_test";

  const environment = {
    ...process.env,
    DATABASE_URL: testUrl.toString()
  };

    const prismaCli = require("node:path").resolve(
    __dirname,
    "../node_modules/prisma/build/index.js"
    );  
    const tsxCli = require.resolve("tsx/cli");

  const commands = [
    {
      name: "Migracije testne baze",
      args: [prismaCli, "migrate", "deploy"]
    },
    {
      name: "Začetni podatki testne baze",
      args: [prismaCli, "db", "seed"]
    },
    {
      name: "Avtomatizirani testi",
      args: [tsxCli, "--test", "tests/*.test.ts"]
    }
  ];

  for (const command of commands) {
    console.log(`\n${command.name}`);

    const result = spawnSync(process.execPath, command.args, {
      cwd: require("node:path").resolve(__dirname, ".."),
      env: environment,
      stdio: "inherit",
      shell: false
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }
  }
}

try {
  main();
} catch (error) {
  console.error("Zagon testov ni uspel:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}