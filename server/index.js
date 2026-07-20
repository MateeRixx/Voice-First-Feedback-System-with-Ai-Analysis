const { execSync, spawn } = require("child_process");
const path = require("path");

const cwd = __dirname;

const migrateUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
try {
  execSync("npx prisma migrate deploy", {
    cwd,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: migrateUrl },
  });
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
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
