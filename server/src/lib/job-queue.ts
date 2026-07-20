import "dotenv/config"
import { PgBoss } from "pg-boss"

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL!,
  schema: "truetone_queue",
})

export async function startQueue() {
  await boss.start()
  try {
    await boss.createQueue("process-response", {
      retryLimit: 3,
      retryDelay: 5,
    })
  } catch {
    // queue already exists
  }
  console.log("pg-boss queue started")
  return boss
}

export async function enqueueProcessResponse(responseId: string) {
  await boss.send("process-response", { responseId }, {
    retryLimit: 3,
    retryDelay: 5,
  })
}

export async function stopQueue() {
  await boss.stop()
}

export default boss
