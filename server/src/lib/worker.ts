import "dotenv/config"
import boss from "./job-queue"
import { processResponse } from "./process-response"

export function startWorker() {
  boss.work<{ responseId: string }>(
    "process-response",
    { localConcurrency: 3 },
    async (jobs) => {
      for (const job of jobs) {
        await processResponse(job.data.responseId)
      }
    },
  )

  console.log("pg-boss worker registered for queue: process-response")
}
