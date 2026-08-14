const healthUrl = process.env.BACKEND_HEALTH_URL || 'http://127.0.0.1:3000/health'
const timeoutMs = Number(process.env.BACKEND_START_TIMEOUT_MS || 30_000)
const deadline = Date.now() + timeoutMs
let ready = false

process.stdout.write(`Waiting for backend at ${healthUrl}`)

while (Date.now() < deadline) {
  try {
    const response = await fetch(healthUrl)
    await response.arrayBuffer()
    if (response.ok) {
      ready = true
      break
    }
  } catch {
    // The backend is still connecting to PostgreSQL or running migrations.
  }

  process.stdout.write('.')
  await new Promise((resolve) => setTimeout(resolve, 250))
}

if (ready) {
  process.stdout.write(' ready.\n')
} else {
  process.stderr.write(`\nBackend did not become ready within ${timeoutMs}ms.\n`)
  process.exitCode = 1
}
