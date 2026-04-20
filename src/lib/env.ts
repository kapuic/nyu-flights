const defaultDatabaseUrl = "postgres://postgres:postgres@127.0.0.1:55432/air_ticket_reservation"
const defaultSessionSecret = "air-ticket-reservation-session-secret-2026-dev-only"

function readEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim()
  if (value) return value
  return fallback
}

export const env = {
  appName: readEnv("VITE_APP_NAME", "Flights"),
  databaseUrl: readEnv("DATABASE_URL", defaultDatabaseUrl),
  sessionSecret: readEnv("SESSION_SECRET", defaultSessionSecret),
}
