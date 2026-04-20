import { useSession } from "@tanstack/react-start/server"

import { env } from "@/lib/env"

type SessionData = {
  sessionId?: string
}

export function useAppSession() {
  return useSession<SessionData>({
    cookie: {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    name: "skyroute-reserve-session",
    password: env.sessionSecret,
  })
}
