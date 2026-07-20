const { execSync, spawn } = require("child_process");
const path = require("path");

const cwd = __dirname;

const migrateUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
console.log("Migration using host:", new URL(migrateUrl).hostname);
const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
    console.warn("Migration attempt", attempt, "failed. Retrying in 5s (Neon cold-start)...");
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
