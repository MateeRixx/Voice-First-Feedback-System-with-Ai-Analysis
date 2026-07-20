const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const cwd = __dirname;

const migrateUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
console.log("Migration using host:", new URL(migrateUrl).hostname);

function releaseLocks() {
  const script = path.join(cwd, ".release-locks.mjs");
  try {
    fs.writeFileSync(
      script,
      `import { Client } from "pg";
const c = new Client({ connectionString: process.env.MIGRATE_URL });
await c.connect();
await c.query("SELECT pg_advisory_unlock_all()");
await c.end();`
    );
    execSync(`node "${script}"`, {
      cwd,
      stdio: "inherit",
      timeout: 10000,
      env: { ...process.env, MIGRATE_URL: migrateUrl },
    });
  } catch {
    // best-effort
  } finally {
    try { fs.unlinkSync(script); } catch {}
  }
}

const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  releaseLocks();
  try {
    execSync("npx prisma migrate deploy", {
      cwd,
      stdio: "inherit",
      timeout: 60000,
      env: { ...process.env, DATABASE_URL: migrateUrl },
    });
    break;
  } catch (err) {
    if (attempt === maxRetries) {
      console.error("Migration failed after", maxRetries, "attempts:", err.message);
      process.exit(1);
    }
    console.warn("Migration attempt", attempt, "failed. Retrying in 5s...");
    execSync("sleep 5", { stdio: "inherit" });
  }
}

const child = spawn("npx", ["tsx", path.join(cwd, "src/index.ts")], {
  stdio: "inherit",
  shell: process.platform === "win32",
  cwd,
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
