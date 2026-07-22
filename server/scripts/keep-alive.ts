const TARGET_URL = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL

if (!TARGET_URL) {
  console.error("Missing TARGET_URL. Set KEEP_ALIVE_URL or RENDER_EXTERNAL_URL env var.")
  process.exit(1)
}

const url = `${TARGET_URL.replace(/\/+$/, "")}/api/health`

fetch(url, { signal: AbortSignal.timeout(10_000) })
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })
  .then((data) => {
    console.log(`[keep-alive] ${url} → ${data.status} at ${data.timestamp}`)
    process.exit(0)
  })
  .catch((err) => {
    console.error(`[keep-alive] ${url} → FAILED: ${err.message}`)
    process.exit(1)
  })
