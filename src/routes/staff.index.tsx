import { createFileRoute, redirect } from "@tanstack/react-router"

import { getCurrentUserFn } from "@/lib/auth"

export const Route = createFileRoute('/staff/')({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: '/staff/login' })
    if (currentUser.role === 'staff') throw redirect({ to: '/staff/app' })
    throw redirect({ to: '/customer' })
  },
  component: StaffIndexPage,
})

function StaffIndexPage() {
  return null
}
