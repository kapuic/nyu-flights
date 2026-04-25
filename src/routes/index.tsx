import { createFileRoute } from "@tanstack/react-router"

import { getCurrentUserFn } from "@/lib/auth"

export const Route = createFileRoute("/")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: PublicHomePage,
})

function PublicHomePage() {
  return <></>
}
